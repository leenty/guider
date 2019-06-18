import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import ReactDOM from 'react-dom'
import c from 'classnames'

class Guider extends Component {
  static propTypes = {
    // 流程数组，必传
    steps: PropTypes.arrayOf(PropTypes.shape({
      // 选择器
      selector: PropTypes.string,
      // 遮罩颜色
      maskColor: PropTypes.string,
      // 遮罩点击后是否关闭
      maskClosable: PropTypes.bool,
      // 遮罩点击事件 参数：无; 有此函数，会取代默认函数处理遮罩点击事件
      onMaskClick: PropTypes.func,
      // 高亮块的样式
      targetStyle: PropTypes.object,
      // z-index
      zIndex: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]),
      // 遮罩区域协作计算函数，一个函数，参与并影响遮罩区域的计算及结果 参数：maskAreaInfo, screen
      maskAreaCollaborator: PropTypes.func,
      // 遮罩目标元素,不传默认全屏,传递null则不产生遮罩
      maskTarget: PropTypes.any,
      // 介绍组件生成器 参数：targetInfo, maskAreaInfo, screen, stepIndex
      introElementCreater: PropTypes.func,
      // 目标元素点击事件 参数：无
      targetClickHandle: PropTypes.func,
      // 每个流程步骤开始时触发 参数：next[func: promise], stepIndex
      onStepStart: PropTypes.func,
      // 每个流程步骤结束时触发 参数：next[func: promise], stepIndex
      onStepEnd: PropTypes.func,
    })),
    // 销毁事件(流程结束)
    onDestroy: PropTypes.func,
    // 引导完成事件
    onComplete: PropTypes.func,
    // 高亮元素的过度动画
    showTransition: PropTypes.bool,
    className: PropTypes.string,
  };

  static defaultProps = {
    steps: [],
    showTransition: false,
    onDestroy() {},
    onComplete() {},
  }

  state = {
    stepIndex: 0, // 流程步骤进度
    stepProps: { // 当前流程参数
      selector: '',
      maskClosable: false,
      targetStyle: {},
      zIndex: '999',
    },
    touchBoxStyle: { // 高亮触摸区域样式
      // transition: 'all .3s',
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 'auto',
      width: 0,
      height: 0,
      boxSizing: 'content-box',
      // borderWidth: '100vh 100vw',
      // borderStyle: 'solid',
      // borderColor: 'rgba(0,0,0,.3)',
      pointerEvents: 'none',
      boxShadow: '0 0 0 200vh rgba(0,0,0,.3)',
    },
    targetInfo: { // 高亮元素位置信息
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    screen: { // 屏幕信息
      width: 0,
      height: 0,
    },
    masks: [], // 遮罩列表
    maskAreaInfo: { // 遮罩区域
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    maskAreaStyle: { // 遮罩区域样式
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 'auto',
      width: 0,
      height: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
    },
    viewStyle: { // 视图样式 (目前用来控制显示隐藏)
      display: 'block',
    },
    isStart: false, // 是否开始引导
  }

  // 高亮的目标元素
  target = null
  // 高亮的目标元素的点击事件
  targetClickHandle = null

  // 组件初始化之后不再直接开始流程，而是等待调用start方法开始流程
  // componentDidMount() {
  //   this.computedStateByStep(this.state.stepIndex)
  // }

  computedStateByStep(stepIndex) {
    const stepProps = this.props.steps[stepIndex]
    stepProps.zIndex = stepProps.zIndex === '' ? '999' : stepProps.zIndex
    const next = () => new Promise(res => {
      const targetInfo = this.getTargetInfo(stepProps)
      const screen = this.getScreenInfo()
      const maskAreaInfo = this.getMaskAreaInfo(screen, stepProps)
      const maskAreaStyle = this.computedMaskAreaStyle(maskAreaInfo, stepProps)
      const touchBoxStyle = this.computedTouchBoxStyle(targetInfo, maskAreaInfo, stepProps)
      const masks = this.computedMasks(targetInfo, maskAreaInfo, stepProps)
      this.setState({
        stepIndex,
        stepProps,
        targetInfo,
        screen,
        touchBoxStyle,
        masks,
        maskAreaInfo,
        maskAreaStyle,
        isStart: true,
      }, res)
    })
    if (stepProps.onStepStart) {
      // 如果存在流程步骤开始事件，则触发
      stepProps.onStepStart(next, stepIndex)
    } else {
      // 不存在则正常运行
      next()
    }
  }

  getBoundingClientRect(target) {
    const info = target.getBoundingClientRect()
    return {
      width: info.width || 0,
      height: info.height || 0,
      x: info.x || info.left || 0,
      y: info.y || info.top || 0,
      top: info.top || 0,
      bottom: info.bottom || 0,
      left: info.left || 0,
      right: info.right || 0,
      // zIndex: window.getComputedStyle(this.target).zIndex
    }
  }

  // 获取目标元素信息
  getTargetInfo(stepProps) {
    const target = document.querySelector(stepProps.selector)
    this.target = target || document.createElement('div')
    const targetInfo = this.getBoundingClientRect(this.target)
    // console.log('targetInfo:', targetInfo)
    this.addTargetListener(stepProps)
    return targetInfo
  }

  // 添加目标高亮元素的监听
  addTargetListener(stepProps) {
    this.targetClickHandle = (e) => {
      stepProps.targetClickHandle && stepProps.targetClickHandle(e)
      this.removeTargetListener()
    }
    this.target.addEventListener('click', this.targetClickHandle)
  }

  // 移出目标高亮元素的监听
  removeTargetListener() {
    this.target.removeEventListener('click', this.targetClickHandle)
    this.targetClickHandle = null
  }

  // 计算可触摸样式
  computedTouchBoxStyle(targetInfo, maskAreaInfo, stepProps) {
    const {showTransition} = this.props
    // 选择遮罩颜色
    const currentMaskColor = stepProps.maskColor || 'rgba(0,0,0,.5)'
    // 阴影数组
    const boxShadowArray = [`0 0 0 200vh ${currentMaskColor}`]
    // 加入用户阴影样式
    stepProps.targetStyle &&
    stepProps.targetStyle.boxShadow &&
    boxShadowArray.push(stepProps.targetStyle.boxShadow)
    // 生成遮罩样式
    const targetBoxShadow = boxShadowArray.join(',')
    return {
      transition: !showTransition && (this.state.targetInfo.width === 0 || targetInfo.width === 0)
        ? 'none'
        : 'all .3s', // 加个动画
      position: 'absolute',
      left: targetInfo.x - maskAreaInfo.x,
      top: targetInfo.y - maskAreaInfo.y,
      // zIndex: 0,
      width: targetInfo.width,
      height: targetInfo.height,
      boxSizing: 'content-box',
      pointerEvents: 'none',
      zIndex: stepProps.zIndex,
      ...stepProps.targetStyle,
      boxShadow: targetBoxShadow,
    }
  }

  // 计算所有遮罩
  computedMasks(targetInfo, maskAreaInfo, stepProps) {
    // const masks = []
    // masks.push({})
    return this.createWrappedMasks(targetInfo, maskAreaInfo, stepProps)
  }

  // 创建环绕遮罩
  createWrappedMasks(targetInfo, maskAreaInfo, stepProps) {
    const masks = []
    // 上
    masks.push({
      position: 'fixed',
      zIndex: stepProps.zIndex,
      left: `${maskAreaInfo.x}px`,
      top: `${maskAreaInfo.y}px`,
      width: `${maskAreaInfo.width}px`,
      height: `${targetInfo.y - maskAreaInfo.y}px`,
    })
    // 下
    masks.push({
      position: 'fixed',
      zIndex: stepProps.zIndex,
      left: `${maskAreaInfo.x}px`,
      top: `${targetInfo.bottom}px`,
      width: `${maskAreaInfo.width}px`,
      height: `${maskAreaInfo.bottom - targetInfo.bottom}px`,
    })
    // 左
    masks.push({
      position: 'fixed',
      zIndex: stepProps.zIndex,
      left: `${maskAreaInfo.x}px`,
      top: `${targetInfo.y}px`,
      width: `${targetInfo.left - maskAreaInfo.left}px`,
      height: `${targetInfo.height}px`,
    })
    // 右
    masks.push({
      position: 'fixed',
      zIndex: stepProps.zIndex,
      left: `${targetInfo.right}px`,
      top: `${targetInfo.y}px`,
      width: `${maskAreaInfo.right - targetInfo.right}px`,
      height: `${targetInfo.height}px`,
    })
    return masks
  }

  // 获取屏幕信息
  getScreenInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  // 获取遮罩区域
  getMaskAreaInfo(screen, stepProps) {
    // 沿用上次数据
    let maskAreaInfo = {
      ...this.state.maskAreaInfo,
      width: screen.width,
      height: screen.height,
      right: screen.width,
      bottom: screen.height,
      left: 0,
      top: 0,
      x: 0,
      y: 0,
    }

    if (stepProps.maskTarget) {
      // 有遮罩目标，则值遮罩目标区域
      const maskTargetInfo = this.getBoundingClientRect(stepProps.maskTarget)
      maskAreaInfo = {
        ...maskAreaInfo,
        ...maskTargetInfo,
      }
    }
    if (stepProps.maskTarget === null) {
      // 遮罩目标为空，表示不希望产生遮罩，一切置0
      maskAreaInfo = {
        ...maskAreaInfo,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
        left: 0,
        top: 0,
        x: 0,
        y: 0,
      }
    }
    if (stepProps.maskAreaCollaborator) {
      // 有传入遮罩区域协作计算函数，则调用合并结果
      maskAreaInfo = {
        ...maskAreaInfo,
        ...stepProps.maskAreaCollaborator(maskAreaInfo, screen),
      }
    }
    // console.log('maskAreaInfo:', maskAreaInfo)
    return maskAreaInfo
  }

  computedMaskAreaStyle(maskAreaInfo, stepProps) {
    return {
      ...this.state.maskAreaStyle,
      left: maskAreaInfo.x,
      top: maskAreaInfo.y,
      width: maskAreaInfo.width,
      height: maskAreaInfo.height,
      zIndex: stepProps.zIndex,
    }
  }

  next = () => {
    const stepIndex = this.state.stepIndex + 1
    const totalStepCount = this.props.steps.length - 1
    const next = () => setTimeout(() => {
      // 放入异步队列，能保证目标组件完成渲染
      if (stepIndex > totalStepCount) {
        // 调用完成回调
        this.props.onComplete()
        // 流程走完，执行销毁
        this.destroy()
      } else {
        // 流程继续，进入下一个步骤
        this.computedStateByStep(stepIndex)
      }
    }, 0)
    if (this.state.stepProps.onStepEnd) {
      // 如果存在流程步骤结束事件，则触发
      this.state.stepProps.onStepEnd(next, this.state.stepIndex)
    } else {
      // 不存在则正常运行
      next()
    }
  }

  destroy = () => {
    this.targetClickHandle && this.removeTargetListener()
    this.props.onDestroy()
  }

  hidden = () => new Promise((res) => {
    this.targetClickHandle && this.removeTargetListener()
    this.setState({
      viewStyle: {
        ...this.state.viewStyle,
        display: 'none',
      }
    }, res)
  })

  show = () => new Promise((res) => {
    this.setState({
      viewStyle: {
        ...this.state.viewStyle,
        display: 'block',
      }
    }, () => {
      this.targetClickHandle || this.addTargetListener(this.state.stepProps)
      res()
    })
  })

  start = () => {
    this.computedStateByStep(this.state.stepIndex)
  }

  render() {
    const {
      touchBoxStyle, maskAreaStyle, viewStyle,
      masks, targetInfo, maskAreaInfo, stepProps,
      isStart,
    } = this.state
    const className = this.props.className
    if (!isStart) {
      return null
    }
    return <Fragment>
      <div className={c('guider__maskArea', className)} style={{...maskAreaStyle, ...viewStyle}}>
        <div className="guider__touchBox" style={touchBoxStyle}></div>
      </div>
      {masks.map((mask, key) => (
        <div
          className={c('guider__mask', className)}
          style={{...mask, ...viewStyle}}
          key={key}
          onClick={() => {
            if (stepProps.maskClosable) {
              if (stepProps.onMaskClick) {
                // 设置了遮罩点击事件则执行
                stepProps.onMaskClick()
              } else {
                // 否则执行下一步
                this.next()
              }
            }
          }}
        ></div>
      ))}
      {!!this.state.stepProps.introElementCreater &&
        <div className={className} style={viewStyle}>{this.state.stepProps.introElementCreater(targetInfo, maskAreaInfo, this.state.screen, this.state.stepProps.stepIndex)}</div>
      }
    </Fragment>
  }

  static create({
    steps = [], callback, className = '',
    onDestroy, onComplete = () => {},
  }) {
    const div = document.createElement('div')
    let called = false
    let isDestroy = false
    const rootDestroy = () => {
      if (!isDestroy) {
        isDestroy = true
        ReactDOM.unmountComponentAtNode(div)
        div.parentNode.removeChild(div)
        onDestroy()
      }
    }

    document.body.appendChild(div)
    function ref(guider) {
      if (called) {
        return
      }
      // console.log('guider: ', guider)
      called = true
      callback && callback({
        // notice(noticeProps) {
        //   guider.add(noticeProps);
        // },
        // removeNotice(key) {
        //   guider.remove(key);
        // },
        steps,
        component: guider,
        start() {
          if (isDestroy) {
            return
          }
          guider.start()
        },
        destroy() {
          if (isDestroy) {
            return
          }
          guider.destroy()
          rootDestroy()
        },
        next() {
          if (isDestroy) {
            return
          }
          guider.next()
        },
        show() {
          if (isDestroy) {
            return
          }
          return guider.show()
        },
        hidden() {
          if (isDestroy) {
            return
          }
          return guider.hidden()
        },
      });
    }
    ReactDOM.render(
      <Guider
        steps={steps}
        className={className}
        ref={ref}
        onDestroy={rootDestroy}
        onComplete={onComplete}
      />, div
    )
  }
}

export default Guider
