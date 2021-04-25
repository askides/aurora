export const Show = ({ when, children }) => (when ? children : null);

Show.defaultProps = {
  when: false,
};
