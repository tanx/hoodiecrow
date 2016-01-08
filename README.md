Hoodiecrow [![Build Status](https://travis-ci.org/tanx/hoodiecrow.svg?branch=master)](https://travis-ci.org/tanx/hoodiecrow)
==========

Hoodiecrow is a community supported fork of [Whiteout Mail](https://github.com/whiteout-io/mail) an easy to use email client with integrated OpenPGP encryption written in pure JavaScript. Unlike Whiteout, Hoodiecrow focuses on providing an optimized user experience for Google Mail users via the [REST based Gmail api](https://developers.google.com/gmail/api/), instead of supporting all standard mail servers via IMAP/SMTP.

![Screenshot](https://raw.githubusercontent.com/tanx/hoodiecrow/master/res/placeit.png)

### Privacy and Security

We take the privacy of your data very seriously. Here are some of the technical details:

* The code has undergone a [full security audit](https://blog.whiteout.io/2015/06/11/whiteout-mail-1-0-and-security-audit-by-cure53/) by [Cure53](https://cure53.de).

* Messages are [encrypted end-to-end ](http://en.wikipedia.org/wiki/End-to-end_encryption) using the [OpenPGP](http://en.wikipedia.org/wiki/Pretty_Good_Privacy) standard. This means that only you and the recipient can read your mail. Your messages and private PGP key are stored only on your computer (in IndexedDB).

* Users have the option to use [encrypted private key sync](https://github.com/tanx/hoodiecrow/wiki/Secure-OpenPGP-Key-Pair-Synchronization-via-IMAP) if they want to use Hoodiecrow on multiple devices.

* [Content Security Policy (CSP)](http://www.html5rocks.com/en/tutorials/security/content-security-policy/) is enforced to prevent injection attacks.

* HTML mails are sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) and are rendered in a sandboxed iframe.

* Displaying mail images is optional and opt-in by default.

* TLS is used to protect your password and message data in transit.

* The app is deployed as a signed [Chrome Packaged App](https://developer.chrome.com/apps/about_apps.html) with [auditable static versions](https://github.com/tanx/hoodiecrow/releases) in order to prevent [problems with host-based security](https://tankredhase.com/2014/04/13/heartbleed-and-javascript-crypto/).

* The app can also be used as a [Progressive Web App](https://infrequently.org/2015/06/progressive-apps-escaping-tabs-without-losing-our-soul/) from any modern web browser using the new Service Worker apis. **Please keep in mind that this mode of operation is not as secure as using the signed packaged app, since users must trust the webserver to deliver the correct code. This mode will still protect user against passive attacks like wiretapping (since PGP and TLS are still applied in the user's browser), but not against active attacks from the webserver. So it's best to decide which threat model applies to you.**


### Reporting bugs and feature requests

* You can just create an [issue](https://github.com/tanx/hoodiecrow/issues) on GitHub if you're missing a feature or just want to give us feedback. It would be much appreciated!

### Testing

You can download a prebuilt bundle under [releases](https://github.com/tanx/hoodiecrow/releases) or build your own from source (requires [node.js](http://nodejs.org/download/), [grunt](http://gruntjs.com/getting-started#installing-the-cli) and [sass](http://sass-lang.com/install)):

    npm install && npm test

This will download all dependencies, run the tests and build the Chrome Packaged App bundle **release/hoodiecrow_DEV.zip** which can be installed under [chrome://extensions](chrome://extensions) in developer mode.

### Development
For development you can start a connect dev server:

    grunt dev

Then visit [http://localhost:8580/dist/#/account?dev=true](http://localhost:8580/dist/#/account?dev=true) for front-end code or [http://localhost:8580/test/unit/](http://localhost:8580/test/unit/) to test JavaScript changes. You can also start a watch task so you don't have rebuild everytime you make a change:

    grunt watch

## Releasing Chrome App

    grunt release-test --release=0.0.0.x
    grunt release-stable --release=0.x.0

## Deploying Web App & Selfhosting

The App can be used either as a Chrome Packaged App or just by hosting it on your own trusted web server. You can build the app from source.

### Build from source

Clone the git repository

    git clone https://github.com/tanx/hoodiecrow.git

Build and generate the `dist/` directory:

    npm install && grunt

### Running the server

To test the server, start it in development mode (without SSL):

    node server.js --dev

Navigate to [http://localhost:8889](http://localhost:8889) (or whatever port is set using the `PORT` environment variable).

To start the server for production use (this automatically redirects to `https`)

    npm start

**A note on security: The app should not be used without SSL so it's best to set up a reverse proxy or Loadbalancer with your SSL certificates.**

To start the server in development mode (no forced HTTPS, iframe loads http content), run `node server.js --dev`

## License

See the [LICENSE.txt](https://github.com/tanx/hoodiecrow/blob/master/LICENSE.txt) file.

### Third party libraries

We work together with existing open source projects wherever possible and contribute any changes we make back upstream. Many of theses libraries are licensed under an open source license. Here are some of them:

* [OpenPGP.js](http://openpgpjs.org) (LGPL license): An implementation of OpenPGP in Javascript
* [email.js](http://emailjs.org) (MIT license): IMAP, SMTP, MIME-building and MIME-parsing engine
* [Forge](https://github.com/digitalbazaar/forge) (BSD license): An implementation of TLS in JavaScript
