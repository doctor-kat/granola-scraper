const path = require('path');

module.exports = {
    target: 'node',
    entry: './src/lambda-script.tsx',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].bundle.js',
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        // modules: ['src', 'node_modules'],
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                include: path.resolve(__dirname, 'src'),
                loader: 'ts-loader',
            },
        ],
    },
};
