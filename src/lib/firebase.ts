// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set, onValue } from "firebase/database"; // 添加这行

const firebaseConfig = {
  apiKey: "AIzaSyAqxyNhIRT5X_sZduqMo5rF55Cl_PJT-YE",
  authDomain: "qiujin-yufafa.firebaseapp.com",
  databaseURL: "https://qiujin-yufafa-default-rtdb.asia-southeast1.firebasedatabase.app", // 必须添加
  projectId: "qiujin-yufafa",
  storageBucket: "qiujin-yufafa.appspot.com", // 修正storageBucket格式
  messagingSenderId: "929549606205",
  appId: "1:929549606205:web:e4f5e9c99d8cbeb42ef954",
  measurementId: "G-KYD2BM94NC"
};

// 初始化Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app); // 添加这行

export { db, ref, set, onValue }; // 确保导出这些方法