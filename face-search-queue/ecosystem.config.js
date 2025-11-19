module.exports = {
    apps: [
        {
            name: "face-search-queue",
            script: "pnpm",
            args: "start",
            env: {
              PORT: 4102,
                NODE_ENV: "production",
            },
        },
    ],
};