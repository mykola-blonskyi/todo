const path = require('path');

function forPackage(pkg) {
  return (files) => {
    const relative = files.map((file) => path.relative(pkg, file));
    return [
      `pnpm --filter ${pkg} exec eslint --fix ${relative.join(' ')}`,
      `pnpm --filter ${pkg} exec prettier --write ${relative.join(' ')}`,
    ];
  };
}

module.exports = {
  'backend/**/*.ts': forPackage('backend'),
  'frontend/**/*.{ts,tsx}': forPackage('frontend'),
};
