// middlewares/auth.js
const User = require('../models/user');
const { Clerk } = require('@clerk/clerk-sdk-node');
const clerkBackend = new Clerk(process.env.CLERK_SECRET_KEY);

async function ensureUser(req, res, next) {
  console.log('Entering ensureUser middleware');
  try {
    const sessionToken = req.cookies.__session;
    if (!sessionToken) {
      throw new Error('No session token provided');
    }
    console.log('Session token found:', sessionToken);

    const session = await clerkBackend.sessions.verifySession(sessionToken);
    console.log('Session verified', session);

    let user = await User.findOne({ clerkId: session.userId });
    if (!user) {
      console.log('User not found in database, fetching from Clerk');
      const clerkUser = await clerkBackend.users.getUser(session.userId);
      console.log('User fetched from Clerk', clerkUser);

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
    console.error('Authentication error:', error);
    res.status(401).send('Authentication required');
  }
}

module.exports = { ensureUser };
