// middlewares/auth.js
const User = require('../models/user');
const { Clerk } = require('@clerk/clerk-sdk-node');
const clerkBackend = new Clerk(process.env.CLERK_SECRET_KEY);

async function ensureUser(req, res, next) {
  try {
    const sessionToken = req.cookies.__session;
    if (!sessionToken) {
      return res.redirect('https://known-ibex-41.accounts.dev/sign-in');
    }

    const session = await clerkBackend.sessions.verifySession(sessionToken);
    req.user = await User.findOne({ clerkId: session.userId });

    if (!req.user) {
      // If user data is not found in your DB, fetch from Clerk and create/update as necessary
      const clerkUser = await clerkBackend.users.getUser(session.userId);
      req.user = new User({
        clerkId: clerkUser.id,
        displayName: clerkUser.firstName + ' ' + clerkUser.lastName,
        email: clerkUser.emailAddresses[0].emailAddress,
      });
      await req.user.save();
    }
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).send('Authentication required');
  }
}



module.exports = { ensureUser };
