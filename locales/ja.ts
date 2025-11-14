const ja = {
  common: {
    appName: 'SoJio Clean Hub',
    translateEngineTitle: '翻訳エンジン',
    translateEngineDescription: '選択した言語でページとメモを翻訳します。',
    translateNow: '翻訳する',
    cancel: 'キャンセル',
    loading: '読み込み中...',
  },
  login: {
    welcomeTitle: 'SoJio へようこそ',
    welcomeSubtitle: '新規ユーザーを検出しました。登録を完了するためにプロフィールを入力してください。',
    lineLogin: 'LINE でログイン',
    lineRegister: 'アカウントがない？ LINE で登録',
    registerNow: '今すぐ登録',
    backToLogin: 'ログイン画面に戻る',
    loginDescriptionTitle: 'ご案内',
    descriptionOne: '既存のアカウントは関連付けられたすべての役割を自動で読み込みます。',
    descriptionTwo: '1つの LINE アカウントで清掃員、管理者、オーナーなど複数の役割を登録できます。',
    descriptionThree: '認証後はダッシュボードで自由に役割を切り替えられます。',
    newUserDetected: '新規ユーザーを検出しました。登録を完了するためにプロフィールを入力してください。',
    registerSuccessNote: '登録後は1つの LINE アカウントで複数の役割を管理でき、タスクと通知も保持されます。',
    errors: {
      oauthFailed: 'LINE ログインに失敗しました。再度お試しください。',
      loginFailed: 'ログイン処理に失敗しました。再度お試しください。',
      generic: 'ログイン中にエラーが発生しました。',
    },
    states: {
      loggingIn: 'ログイン中...',
      registering: '登録中...',
    },
  },
  translation: {
    panelTitle: 'ページを翻訳',
    panelSubtitle: 'システム構成とメモを含む',
    switchTo: '切り替え',
    engineAria: '翻訳エンジンを開く',
  },
  dashboard: {
    loadingMessage: 'ダッシュボードを読み込み中...',
    cleaner: {
      title: '私の清掃タスク',
      actions: {
        availability: 'スケジュール登録',
        viewAllTasks: 'すべてのタスクを見る',
      },
    },
    manager: {
      title: 'タスク管理',
      actions: {
        toggleViewToCalendar: 'カレンダービュー',
        toggleViewToList: 'リストビュー',
        hotels: 'ホテル一覧',
        applications: '申請を審査',
        createTask: 'タスクを作成',
      },
      list: {
        loading: '読み込み中...',
        empty: 'タスクはまだありません',
        detailHint: '詳細を見るにはタスクカードを選択してください',
        collapse: '折りたたむ',
        expand: '展開',
        collapseTooltip: '詳細パネルを折りたたむ',
        expandTooltip: '詳細パネルを展開',
      },
    },
    owner: {
      title: '宿泊カレンダー',
      actions: {
        addEntry: '宿泊登録を追加',
        manageHotels: 'ホテルを管理',
      },
      modals: {
        entryTitle: '宿泊登録を追加',
      },
      alerts: {
        selectHotel: 'ホテルを選択してください',
        createFailed: '宿泊登録の作成に失敗しました',
      },
    },
  },
};

export default ja;

