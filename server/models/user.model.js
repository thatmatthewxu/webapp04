const validator = require('validator');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { mongoose } = require('./../db/mongoose');
const { UserProfile } = require('./userprofile.model');

var UserSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        unique: true,
        required: true,
        minlength: 4
    },
    email: {
        type: String,
        required: true,
        trim: true,
        minlength: 6,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email.'
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 4
    },
    userProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserProfile',
        required: true
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

UserSchema.methods.toJSON = function() {
    var user = this;
    var userObject = user.toObject();

    return _.pick(userObject, ['_id', 'name', 'email']);
};

UserSchema.methods.generateAuthToken = function() {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET).toString();

    user.tokens.push({access, token});

    return user.save()
        .then( () => {
            return token;
        });
};

UserSchema.statics.findByToken = function(token) {
    var User = this;
    var decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch(e) {
        return Promise.reject();
    }

    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    })
};

UserSchema.statics.findByCredential = function(email, password) {
    var User = this;

    return User.findOne({email})
        .then( (user) => {
            if (!user) {
                return Promise.reject();
            }

            return new Promise((resolve, reject) => {
                // Use bcrypt.compare to compare the password and the user.password
                bcrypt.compare(password, user.password, (err, res) => {
                    if (res) {
                        resolve(user);
                    } else (
                        reject()
                    )
                });
            });
        });
};

UserSchema.pre('save', function(next) {
   var user = this;

   if (user.isModified('password')) {
       bcrypt.genSalt(10, (err, salt) => {
           bcrypt.hash(user.password, salt, (err, hash) => {
               user.password = hash;
               next();
           });
       });
   } else {
       next();
   }
});

var User = mongoose.model('User', UserSchema);

module.exports = { User };