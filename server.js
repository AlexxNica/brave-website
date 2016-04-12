/* jshint asi: true */
/* jshint esversion: 6 */

'use strict'

const Hapi = require('hapi')
var assets = require('./assets.js')
var mailchimp = require('./mailchimp.js')

const server = new Hapi.Server()
var useragent = require('useragent')

server.connection({ port: process.env.PORT || 3000 })

server.register({ register: require('crumb'), options:
  {
    cookieOptions: {
      clearInvalid: true,
      isSecure: true
   }
  }
 }, (err) => {
  if (err) {
    console.log('Failed to load crumb.')
  }

  /* API endpoints */

  // mailchimp methods
  server.route({
      method: 'POST',
      path: '/api/mailchimp',
      config: {
        state: {
          parse: true,
          failAction: 'log'
        },
        security: {
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
          , xframe: true
        }
      },
      handler: function (request, reply) {
        mailchimp.api(request, reply)
      }
  })

  // crumb
  server.route({
      method: 'GET',
      path: '/api/crumb',
      config: {
        state: {
          parse: true,
          failAction: 'log'
        },
        security: {
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
          , xframe: true
        }
      },
      handler: function (request, reply) {
        reply({cookie: request.headers.cookie})
      }
  })

   const downloadRedirects = (ua) => {
     var agent = useragent.parse(ua)
     var os = agent.os.toString()
     if (os.match(/^iOS/)) {
       return "https://itunes.apple.com/ca/app/brave-web-browser/id1052879175?mt=8#"
     }
     if (os.match(/^Android/)) {
       return 'https://play.google.com/store/apps/details?id=com.linkbubble.playstore'
     }
     return 'https://github.com/brave/browser-laptop/releases'
   }

   // Download links
   server.route({
     method: 'GET',
     path: '/api/download',
     config: {
       state: {
         failAction: 'log'
       }
     },
     handler: function (request, reply) {
       reply().redirect(downloadRedirects(request.headers['user-agent']))
     }
   })

})


server.register(require('inert'), (err) => {
  var map = [
      { path: '/', file: './public/index.html' },
      { path: '/privacy_android', file: './public/android_privacy.html' },
      { path: '/privacy_ios', file: './public/ios_privacy.html' },
      { path: '/terms_of_use', file: './public/terms_of_use.html' }
  ]

  if (err) {
    console.log('Failed to load inert.')
  }

  // A server redirect to our favorite band, Brave Combo.
  server.route({
    method: 'GET',
    path: '/bo/{path*}',
    handler: function (request, reply) {
      reply.redirect('http://bravecombo.com/' + (request.params.path ? request.params.path : ''))
    }
  })

  map.forEach((entry) => {
    server.route({
      method: 'GET',
      path: entry.path,
      config: {
        state: {
          failAction: 'log'
        }
      },
      handler: function (request, reply) {
        reply.file(entry.file)
      }
    })
  })

  // Serves static files out of public/
  server.route({
    method: 'GET',
    path: '/{path*}',
    config: {
      state: {
        parse: true,
        failAction: 'log'
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        xframe: true
      }
    },
    handler: {
      directory: {
        path: './public'
      }
    }
  })

})

server.ext('onRequest', function (request, reply) {
    if (request.headers['x-forwarded-proto'] != 'https') {
      return reply()
        .redirect('https://' + request.headers.host + request.url.path)
        .code(301);
    }
    reply.continue()
})

server.start(() => {
    console.log('Brave server running at:', server.info.uri);
});
