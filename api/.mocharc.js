module.exports = {
  timeout: 30000,
  recursive: true,
  exit: true,
  require: ['ts-node/register'],
  extensions: ['ts'],
  'ts-node': {
    project: './tsconfig.json'
  }
}