// middlewares/auth.js
const User = require('../models/user');
const { Clerk } = require('@clerk/clerk-js');
const clerkBackend = new Clerk(process.env.CLERK_SECRET_KEY);

async function ensureUser(req, res, next) {
  try {
    const sessionToken = req.cookies.__session;
    const session = await clerkBackend.sessions.verifySession(sessionToken);

    let user = await User.findOne({ clerkId: session.userId });
    if (!user) {
      const clerkUser = await clerkBackend.users.getUser(session.userId);
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
    console.error('Authentication error', error);
    res.status(401).send('Authentication required');
  }
}

module.exports = { ensureUser };
