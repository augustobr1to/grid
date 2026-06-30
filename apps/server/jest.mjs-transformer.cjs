module.exports = {
  process(sourceText) {
    return {
      code: sourceText.replace(
        /export \{ ([^}]+) \};\s*$/,
        (_match, names) => `module.exports = { ${names} };`,
      ),
    };
  },
};
