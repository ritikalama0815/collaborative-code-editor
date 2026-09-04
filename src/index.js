/**
 * @fileoverview Browser entry: mounts the React tree inside BrowserRouter.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

/** @type {import('react-dom/client').Root} Concurrent root attached to `#root`. */
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <Router>
    <App/>
  </Router>
);

reportWebVitals();
