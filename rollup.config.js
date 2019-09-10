import babel from "rollup-plugin-babel";

export default {
  input: './src/react/Guider.js',
  output: [
    {
      file: './dist/guider-es.js',
      format: 'es',
      banner: '// leenty.com',
      footer: '// leenty@qq.com'
    }
    // , {
    //   file: './dist/guider-cjs.js',
    //   format: 'cjs',
    //   banner: '// leenty.com',
    //   footer: '// leenty@qq.com'
    // }, {
    //   file: './dist/guider-iife.js',
    //   format: 'iife',
    //   name: 'guiderIife123',
    //   banner: '// leenty.com',
    //   footer: '// leenty@qq.com'
    // }, {
    //   file: './dist/guider-umd.js',
    //   format: 'umd',
    //   name: 'guiderUmd123',
    //   banner: '// leenty.com',
    //   footer: '// leenty@qq.com'
    // }, {
    //   file: './dist/guider-amd.js',
    //   format: 'amd',
    //   banner: '// leenty.com',
    //   footer: '// leenty@qq.com'
    // }
  ],
  plugins: [
    babel()
  ],
  external: [
    'react',
    'prop-types',
    'react-dom'
  ],
  // globals: {
  //   'react': 'React',
  //   'prop-types': 'PropTypes',
  //   'react-dom': 'ReactDOM',
  //   'classnames': 'c'
  // }
}
