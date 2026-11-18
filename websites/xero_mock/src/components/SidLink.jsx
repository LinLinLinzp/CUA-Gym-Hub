import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { withSid } from '../utils/dataManager.js';
export const SidLink = ({
  to,
  ...props
}) => <Link to={withSid(to)} {...props} />;
export const useSidNavigate = () => {
  const navigate = useNavigate();
  return (to, options) => navigate(withSid(to), options);
};
