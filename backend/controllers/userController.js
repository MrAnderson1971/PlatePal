const User = require("../models/userModel");
const {sign} = require("jsonwebtoken");
const {hash, compare} = require("bcrypt");
const sendEmail = require("./emailService");
const validator = require('validator');
const crypto = require('crypto');
const Recipe = require("../models/recipeModel");

const handleSignup = async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({error: 'Email and password are required.'});
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({error: 'Invalid email format.'});
    }

    try {
        const user = await User.findOne({email: email});
        if (user) {
            return res.status(400).json({error: 'Error: email already in use.'});
        }
        const hashedPassword = await hash(password, 10);
        const newUser = new User({email: email, password: hashedPassword, recipes: []});
        const token = sign(
            {email: email, id: newUser._id},
            process.env.JWT_SECRET,
            {}
        );
        await newUser.save();
        return res.status(201).json({message: 'Signup successful.', token, user: { email: newUser.email, id: newUser._id }});
    } catch (error) {
        return res.status(500).json({error: 'Internal Server Error'});
    }
};

const handleLogin = async (req, res) => {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Invalid email.' });
    }

    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            console.log('User does not exist'); // Detailed error message on backend only for security.
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        let match = await compare(password, user.password);

        // Check for temporary password only if primary password fails
        if (!match && user.tempPassword && user.tempPassword.password) {
            if (user.tempPassword.expiry > new Date()) {
                // Temporary password is valid, compare it
                match = await compare(password, user.tempPassword.password);
            }
            if (match) {
                // Temporary password matched
                user.tempPassword.password = null;
                user.tempPassword.expiry = null;
                await user.save();
            }
        }

        if (!match) {
            console.log('Invalid password');
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const token = sign(
            { email: email, id: user._id },
            process.env.JWT_SECRET,
            rememberMe ? {} : {}
        );
        return res.status(200).json({ message: 'Login successful.', token: token, user: { email: user.email, id: user._id } });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const handlePasswordReset = async (req, res) => {
    const {email} = req.body;

    if (!email) {
        return res.status(400).json({error: 'Email is required.'});
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({error: 'Invalid email.'});
    }

    try {
        const user = await User.findOne({email: email});
        if (!user) {
            return res.status(200).json({message: 'Done.'});
        }

        // Generate a cryptographically secure random temporary password
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const hashedTempPassword = await hash(tempPassword, 10);
        const tempPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        user.tempPassword = {
            password: hashedTempPassword,
            expiry: tempPasswordExpiry
        }

        await Promise.all([
            user.save(),
            sendEmail(email, 'Password Reset',
                `Your temporary password is ${tempPassword}. It will expire in 1 hour. Please do not share it with anyone.`)
        ]);

        return res.status(200).json({message: 'Done.'});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
};

const handleGetRecipesFromUser = async (req, res) => {
    const {id} = req.params;
    console.log(id)

    // if (!email) {
    //     return res.status(400).json({error: 'Email is required.'});
    // }

    // if (!validator.isEmail(email)) {
    //     return res.status(400).json({ error: 'Invalid email.' });
    // }

    try {
        const user = await User.findById(id).populate("recipes");
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        return res.status(200).json(user.recipes);
    } catch (error) {
        return res.status(500).json({error: 'Internal Server Error'});
    }
};

/*
gpt-4o 6/30 16:58 add an endpoint to api/users/ that favorites / unfavorites a recipe
 */
const handleFavoriteRecipe = async (req, res) => {
    const { userId, recipeId } = req.body;

    try {
        const [user, recipe] = await Promise.all([
            User.findById(userId),
            Recipe.findById(recipeId)
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        const recipeIndex = user.favoriteRecipes.indexOf(recipeId);

        if (recipeIndex === -1) {
            // Recipe is not in the favorites, add it
            user.favoriteRecipes.push(recipeId);
            recipe.favoriteCount += 1;
        } else {
            // Recipe is in the favorites, remove it
            user.favoriteRecipes.splice(recipeIndex, 1);
            recipe.favoriteCount -= 1;
        }

        await Promise.all([user.save(), recipe.save()]);

        // Emit the updated favorite count
        const io = req.io;
        io.emit('favoriteUpdate', { recipeId: recipeId, favoriteCount: recipe.favoriteCount });

        console.log("handle favorite recipe", req.body, recipe.favoriteCount);
        return res.status(200).json({ favoriteRecipes: user.favoriteRecipes });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};

const handleUpdateUser = async (req, res)=> {
    const userId = req.params.id;
    let updatedData = req.body;

    // Filter out null values from updatedData
    updatedData = Object.fromEntries(Object.entries(updatedData).filter(([key, value]) => value !== null));

    try {
        if (updatedData.password) {
            updatedData.password = await hash(updatedData.password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updatedData, { new: true, runValidators: true });
        if (!updatedUser) {
            return res.status(404).send({ message: 'User not found' });
        }
        return res.send(updatedUser);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error });
    }
};

module.exports = {
    handleSignup,
    handleLogin,
    handlePasswordReset,
    handleGetRecipesFromUser,
    handleFavoriteRecipe,
    handleUpdateUser
};
