const User = require('../models/user');

const passport = require('passport');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const async = require('async');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const secret = require('../config/secrets');

// Bcrypt options
const bcrypt = require('bcryptjs');
const saltRounds = 10;


/**
 * Transporter for nodemailer
 * We are using a test email and password.
 * I took this out so that we could dry up some of the code
 */
const smtpTransport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: secret.testEmailUsername,
    pass: secret.testEmailPassword
  }
});

exports.authenticate = passport.authenticate('local-login', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: 'Invalid username or password.'
});

// Test Login Route
exports.login = (req, res, next) => {
  const email = req.body.email;
  const inputPassword = req.body.password;

  User.getUserByEmail(email, (err, foundUser) => {
    if (err) {
      console.log(err);
      res.status(404).json({ success: false, user: null });
    } else if (foundUser !== null) {

      // If there is a user with that email, check their password
      bcrypt.compare(inputPassword, foundUser.password, (err, response) => {
        if (err) throw err;
        if (response) {
          // We don't want to pass back the password at all

          const token = jwt.sign({data: foundUser}, secret.session_secret, {
            expiresIn: 604800 // 1 week
          });

          res.json({
            success: true,
            user: foundUser,
            token: `JWT ${token}`
          });
        } else {
          res.json({ success: false, user: null });
        }
      });
    } else {
      // If the was no user found with that user name
      res.json({ success: false, user: null });
    }
  });
};

exports.forgotLogin = (req, res, next) => {
  async.waterfall([

    function (done) {
      crypto.randomBytes(20, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },

    function (token, done) {
      User.findOne({ 'local.email': req.body.email }, function (err, user) {
        if (!user) {
          req.flash('forgotMessage', 'No account with that email was found.');
          return res.redirect('/forgot');
        } else if (err) {
          req.flash('forgotMessage', 'Error');
          return res.redirect('/forgot');
        }
        user.local.resetPasswordToken = token;
        user.local.resetPasswordExpires = Date.now() + 10800000; // 3 Hours
        user.save(function (err) {
          done(err, token, user);
        });
      });
    },

    function (token, user, done) {
      var mailOptions = {
        to: user.local.email,
        from: 'Texas Tech ACM',
        subject: 'TTU ACM Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          req.protocol + '://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      }
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('forgotMessage', 'An email has been sent to ' + user.local.email + ' with a reset link.');
        done(err, 'done');
      });
    }
  ], function (err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
};

/**
 * This logs the user out using Passport.js (req.logout) which clears the
 * login session. This will also redirect the use to the home page
 */
exports.logout = (req, res, next) => {
  req.logout();
  res.redirect('/');
};

// How does this work? What information do I need to pass??
exports.signup = passport.authenticate('local-signup', {
  successRedirect: '/login',
  failureRedirect: '/signup',
  failureFlash: 'Error Signing Up'
});

exports.reset = (req, res, next) => {
  async.waterfall([
    function (done) {
      User.findOne({ 'local.resetPasswordToken': req.params.token, 'local.resetPasswordExpires': { $gt: Date.now() } }, function (err, user) {
        if (!user) req.flash('resetMessage', 'Password reset link is invalid or expired.')
        else if (req.body.password !== req.body.confirmPassword) {
          req.flash('forgotMessage', 'Password and confirm password must match.')
          return res.redirect('/forgot')
        } else if (err) {
          req.flash('forgotMessage', 'Password and confrim password must match.')
          return res.redirect('/forgot')
        } else {
          user.local.password = req.body.password
          user.local.resetPasswordToken = undefined
          user.local.resetPasswordExpires = undefined
          user.save(function (err) {
            if (err) {
              req.flash('loginMessage', 'Error saving to database')
              return res.redirect('/login')
            }
            req.logIn(user, function (err) {
              done(err, user)
            }
            )
          })
        }
      })
    },
    function (user, done) {
      var mailOptions = {
        to: user.local.email,
        from: 'acmtexastech@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account has been changed.\n'
      }
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('resetMessage', 'Your password has been changed.')
        done(err)
      })
    }
    // TODO: Write error handling
  ], function (err) {
    res.redirect('/')
    if (err) {
      req.flash('loginMessage', 'Error sending confirmation email')
      res.redirect('/login')
    }
  })
};

exports.confirmToken = (req, res) => {
  User.findOne({ 'local.confirmEmailToken': req.params.token }, function (err, user) {
    if (!user) {
      return res.redirect('/users/login');
    } else if (err) {
      req.flash('loginMessage', 'Error');
      return res.redirect('/users/login');
    }
    user.verify(req.params.token, function (err) {
      if (err) {
        console.log('Error saving to database.');
        req.flash('loginMessage', 'Error saving to database.');
        return res.redirect('/users/login');
      }
      req.flash('loginMessage', 'Account verified! Please login.');
      return res.redirect('/users/login');
    })
  })
};

exports.resetToken = (req, res) => {
  User.findOne({ 'local.resetPasswordToken': req.params.token, 'local.resetPasswordExpires': { $gt: Date.now() } }, function (err, user) {
    if (!user) {
      req.flash('forgotMessage', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    if (err) {
      req.flash('forgotMessage', 'Error');
      return res.redirect('/forgot');
    }
    // TODO: Move some of this functionality to Angular
    // Figure out how this flash messaging module works
    // What are the modules being passed to this render method?
    res.render('reset', { user: req.user, message: req.flash('resetMessage') });
  })
};

/**
 * This fetches the team from the team.json file
 */
exports.getTeam = (req, res, next) => {
  fs.readFile('./team.json', (err, content) => {
    if (err) {
      res.status(404).json({error: err});
    } else {
      newData = JSON.parse(content);
      res.status(200).json({data: newData});
    }
  });
};

/**
 * This will allow us to edit the team.json file directly when the user
 * has the right credentials
 *
 * We will implement this later
 */
exports.editTeam = '';

/**
 * This is a test for the registration.
 * I'm not sure how the signup method up top really works so I will test my
 * http req on this route
 *
 * This is how the object will look...
 * {
 * cleanFirstName: 'Miggy',
 * cleanLastName: 'Reyes',
 * cleanUsername: 'miggylol',
 * cleanEmail: 'email@gmail.com',
 * classification: 'Freshman',
 * password: 'password'
 * }
 *
 * This can be accessed using req.body.
 *
 * This can also be used when the user does not want to use an auth service
 */
exports.register = (req, res, next) => {
  console.log('Registration route hit');

  // Generates the salt used for hashing
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
      res.status(500).json({success: false});
    } else {
      // Passed the hashed password into the saveUser function
      // so that the we can save the user with a hashed password
      saveUser(hash);
    }
  });

  /**
   * This saves the user with the hashed password
   *
   * The data we are going to save into the database
   * The rest of the model has defualt values
   *
   * The data saved is the user's:
   *  * email
   *  * hashed password
   *  * first and last name
   *  * their classification
   *
   * @param {string} hash The hashed password
   */
  function saveUser(hash) {
    const data = {
      email: req.body.email,
      password: hash,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      classification: req.body.classification
    };

    // New User Object from the mongoose User Schema
    const newUser = new User(data);

    // Saves the new user
    newUser.save((err, createdUser) => {
      if (err) {
        console.log(err);
        res.status(500).json({success: false});
      } else {
        // Send back only the user's username and names
        res.status(200).json({success: true});
      }
    });
  }
};

/**
 * Gets the user's profile based on the ID in their
 * local storage
 */
exports.getProfile = (req, res, next) => {
  res.json({user: req.user});
};

/**
 * This will update the user's profile picture
 * TODO: Make this a path request?
 * TODO: Figure out how to send a picture back to the front end for them to use
 */
exports.updateProfilePicture = (req, res, next) => {
  console.log(req.file);
  console.log('Hit Update');
  res.json({success: true});
};

exports.contactUs = (req, res, next) => {

  const mailOptions = {
    from: `Texas Tech Contact Us <${secret.testEmailUsername}>`,
    to: secret.testEmailUsername,
    subject: "ACM Question",
    html: '<h1>' + 'Sender: ' + req.body.name + ' Message: ' + req.body.message + '</h1>'
  };

  smtpTransport.sendMail(mailOptions, (err, info) => {
    if (err) {
      res.status(500).json({ success: false });
    } else {
      res.status(200).json({ success: true });
    }
    console.log(err, info);
  });
};

exports.updateProfileBio = (req, res, next) => {
};
