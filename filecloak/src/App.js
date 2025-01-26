import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import UserPageText from './pages/UserPageText'
import AdminPageEncryptFile from './pages/AdminPageEncryptFile';
import AdminPageEncryptText from './pages/AdminPageEncryptText';
import AdminPageDecrypt from './pages/AdminPageDecrypt';
import AdminPageDecryptText from './pages/AdminPageDecryptText';
import DataList from './pages/GetDataList';
class MainApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = { apiResponse: "" };
  }

  callApi() {
    fetch("https://filecloak4.vercel.app/api/testApi")
      .then(res => res.text())
      .then(res => this.setState({ apiResponse: res }))
      .catch(err => console.error(err));
  }

  // callApi() {
  //   fetch("http://localhost:4000/api/testApi")
  //     .then(res => res.text())
  //     .then(res => this.setState({ apiResponse: res }))
  //     .catch(err => console.error(err));
  // }

  componentDidMount() {
    this.callApi();
  }

  render() {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/userpage" element={<UserPage />} />
          <Route path="/userpagetext" element={<UserPageText />} />
          <Route path="/encryptfile" element={<AdminPageEncryptFile />} />
          <Route path="/encrypttext" element={<AdminPageEncryptText />} />
          <Route path="/decrypt" element={<AdminPageDecrypt />} />
          <Route path="/decrypttext" element={<AdminPageDecryptText />} />
          <Route path="/datalist" element={<DataList />} />
        </Routes>
      </Router>
    );
  }
}

export default MainApp;
