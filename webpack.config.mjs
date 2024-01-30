import path from 'path';

export default {
    entry: {
        index: './src/index.ts',
        app: './src/app.ts',
        worker: './src/worker.ts',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(process.cwd(), 'public_html/scripts'),
    },
};