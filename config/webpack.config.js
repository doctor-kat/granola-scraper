const path = require('path');

module.exports = {
    target: 'node',
    mode: 'development',
    entry: './src/lambda-script.ts',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].bundle.js',
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                include: path.resolve(__dirname, 'src'),
                loader: 'ts-loader',
            },
			{
				test: /\.json$/,
				include: path.resolve(__dirname, 'data'),
				loader: 'json-loader'
			},
        ],
    },
};
