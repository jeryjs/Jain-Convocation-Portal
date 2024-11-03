export const REQUEST_TYPES = {
  NONE: 0,
  HARDCOPY: 1,
  SOFTCOPY: 2,
  BOTH: 3
};

export const REQUEST_TYPE_LABELS = {
  [REQUEST_TYPES.NONE]: 'No Request',
  [REQUEST_TYPES.HARDCOPY]: 'Hard Copy',
  [REQUEST_TYPES.SOFTCOPY]: 'Soft Copy',
  [REQUEST_TYPES.BOTH]: 'Hard & Soft Copy'
};
