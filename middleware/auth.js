// middlewares/auth.js
const User = require('../models/user');
const { Clerk } = require('@clerk/clerk-sdk-node');
const clerkBackend = new Clerk(process.env.CLERK_SECRET_KEY);

async function ensureUser(req, res, next) {
  try {
    const sessionToken = req.cookies.__session; // Assumes your session token is stored in a cookie
    const session = await clerkBackend.sessions.verifySession(sessionToken);

    const clerkUser = await clerkBackend.users.getUser(session.userId);
    let user = await User.findOne({ clerkId: clerkUser.id });

    if (!user) {
      user = new User({
        clerkId: clerkUser.id,
        displayName: clerkUser.firstName + ' ' + clerkUser.lastName,
        email: clerkUser.emailAddresses[0].emailAddress,
      });
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    // Redirect to Clerk sign-in instead of sending an error
    res.redirect('https://known-ibex-41.accounts.dev/sign-in');
  }
}


module.exports = { ensureUser };
