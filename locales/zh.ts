const zh = {
  common: {
    appName: 'SoJio Clean Hub',
    translateEngineTitle: '翻译引擎',
    translateEngineDescription: '选择语言后，系统会同步翻译当前页面与备注内容。',
    translateNow: '立即翻译',
    cancel: '取消',
    loading: '加载中...',
  },
  login: {
    welcomeTitle: '欢迎加入 SoJio',
    welcomeSubtitle: '检测到您是新用户，请完善身份信息以完成注册。',
    lineLogin: '使用LINE登录',
    lineRegister: '没有账号？使用LINE注册',
    registerNow: '立即注册账号',
    backToLogin: '返回登录页面',
    loginDescriptionTitle: '说明',
    descriptionOne: '已有账号的用户将自动检测并载入全部身份。',
    descriptionTwo: '同一LINE账号可注册清洁员、管理者、房东等多个角色。',
    descriptionThree: '完成认证后可在仪表板中自由切换身份。',
    newUserDetected: '检测到您是新用户，请完善身份信息以完成注册。',
    registerSuccessNote: '注册完成后，您可以在一个LINE账号下管理多个角色身份，系统会为您保留所有任务与通知。',
    errors: {
      oauthFailed: 'LINE登录失败，请重试',
      loginFailed: '登录处理失败，请重试',
      generic: '登录过程中发生错误',
    },
    states: {
      loggingIn: '登录中...',
      registering: '注册中...',
    },
  },
  translation: {
    panelTitle: '翻译当前页面',
    panelSubtitle: '包括系统架构与备注',
    switchTo: '切换至',
    engineAria: '打开翻译引擎',
  },
  dashboard: {
    loadingMessage: '正在加载您的仪表板...',
    cleaner: {
      title: '我的清扫任务',
      actions: {
        availability: '日程注册',
        viewAllTasks: '查看所有任务',
      },
    },
    manager: {
      title: '任务管理',
      actions: {
        toggleViewToCalendar: '日历视图',
        toggleViewToList: '列表视图',
        hotels: '酒店列表',
        applications: '审核申请',
        createTask: '新建任务',
      },
      list: {
        loading: '加载中...',
        empty: '暂无任务',
        detailHint: '点击任务卡片以查看详情',
        collapse: '收缩',
        expand: '展开',
        collapseTooltip: '收缩详情面板',
        expandTooltip: '展开详情面板',
      },
    },
    owner: {
      title: '入住日历',
      actions: {
        addEntry: '添加入住登记',
        manageHotels: '管理酒店',
      },
      modals: {
        entryTitle: '添加入住登记',
      },
      alerts: {
        selectHotel: '请选择酒店',
        createFailed: '创建入住登记失败',
      },
    },
  },
};

export default zh;

