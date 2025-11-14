const en = {
  common: {
    appName: 'SoJio Clean Hub',
    translateEngineTitle: 'Translation Engine',
    translateEngineDescription: 'Pick a language to translate this page and all notes.',
    translateNow: 'Translate',
    cancel: 'Cancel',
    loading: 'Loading...',
  },
  login: {
    welcomeTitle: 'Welcome to SoJio',
    welcomeSubtitle: 'We detected a new user. Complete your profile to finish registration.',
    lineLogin: 'Sign in with LINE',
    lineRegister: 'No account? Register with LINE',
    registerNow: 'Register Now',
    backToLogin: 'Back to Login',
    loginDescriptionTitle: 'Notes',
    descriptionOne: 'Existing accounts automatically load every linked role.',
    descriptionTwo: 'One LINE account can register cleaner, manager, and owner roles.',
    descriptionThree: 'After verification you can switch roles freely in the dashboard.',
    newUserDetected: 'We detected a new user. Complete your profile to finish registration.',
    registerSuccessNote: 'After registration you can manage multiple roles under one LINE account and retain every task and notification.',
    errors: {
      oauthFailed: 'LINE sign-in failed. Please try again.',
      loginFailed: 'Login failed. Please retry.',
      generic: 'An error occurred during login.',
    },
    states: {
      loggingIn: 'Signing in...',
      registering: 'Registering...',
    },
  },
  translation: {
    panelTitle: 'Translate this page',
    panelSubtitle: 'Covers architecture and remarks',
    switchTo: 'Switch to',
    engineAria: 'Open translation engine',
  },
  dashboard: {
    loadingMessage: 'Loading your dashboard...',
    cleaner: {
      title: 'My Cleaning Tasks',
      actions: {
        availability: 'Register Availability',
        viewAllTasks: 'View All Tasks',
      },
    },
    manager: {
      title: 'Task Management',
      actions: {
        toggleViewToCalendar: 'Calendar View',
        toggleViewToList: 'List View',
        hotels: 'Hotel List',
        applications: 'Review Applications',
        createTask: 'Create Task',
      },
      list: {
        loading: 'Loading...',
        empty: 'No tasks yet',
        detailHint: 'Select a task card to view details',
        collapse: 'Collapse',
        expand: 'Expand',
        collapseTooltip: 'Collapse detail panel',
        expandTooltip: 'Expand detail panel',
      },
    },
    owner: {
      title: 'Stay Calendar',
      actions: {
        addEntry: 'Add Stay Entry',
        manageHotels: 'Manage Hotels',
      },
      modals: {
        entryTitle: 'Add Stay Entry',
      },
      alerts: {
        selectHotel: 'Please pick a hotel',
        createFailed: 'Failed to create stay entry',
      },
    },
  },
};

export default en;

