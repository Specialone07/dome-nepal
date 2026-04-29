const isProd = process.env.NODE_ENV === 'production'

const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m'
  })

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  })

const verifyAccessToken  = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET)
const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET)