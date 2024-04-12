const clerkPubKey = process.env.CLERK_PUBLISHABLE_KEY; // Use your actual Clerk public API key
const clerk = new Clerk(clerkPubKey);

clerk.load().then(() => {
  if (clerk.user) {
    document.getElementById('app').innerHTML = '<div id="user-button"></div>';
    clerk.mountUserButton(document.getElementById('user-button'));
  } else {
    document.getElementById('app').innerHTML = '<div id="sign-in"></div>';
    clerk.mountSignIn(document.getElementById('sign-in'));
  }
});
