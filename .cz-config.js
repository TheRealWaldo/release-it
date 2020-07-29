module.exports = {
  scopes: [{ name: 'release' }],

  allowTicketNumber: true,
  isTicketNumberRequired: false,
  ticketNumberPrefix: 'RIT-',
  ticketNumberRegExp: '\\d{1,5}',

  scopeOverrides: {
    chore: [
      { name: 'release' },
    ],
  },

  allowBreakingChanges: ['feat', 'fix'],
  skipQuestions: ['footer'],
  subjectLimit: 72,
  askForBreakingChangeFirst: true,
};
