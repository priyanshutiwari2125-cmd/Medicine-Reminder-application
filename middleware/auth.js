const requireAuth = (req, res, next) => {
  next();
};

const redirectIfLoggedIn = (req, res, next) => {
  res.redirect('/');
};

module.exports = {
  requireAuth,
  redirectIfLoggedIn
};
