import logo from '../../assets/images/logo.png';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, LogIn } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      console.log('Login attempt:', { email, password });
      navigate('/home');
    } else {
      if (password !== confirmPassword) {
        alert("Passwords don't match");
        return;
      }
      console.log('Signup attempt:', { name, email, password });
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl dark:bg-gray-800 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="SASBO - The Finance Union" className="h-24 w-auto mb-4" />
          <h2 className="text-3xl text-cyan-700 dark:text-cyan-400">
            {isLogin ? 'Welcome Back' : 'Join SASBO'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isLogin ? 'Log in to your account' : 'Create your account'}
          </p>
        </div>

        <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isLogin 
                ? 'bg-white dark:bg-gray-600 text-cyan-700 dark:text-cyan-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isLogin 
                ? 'bg-white dark:bg-gray-600 text-cyan-700 dark:text-cyan-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <User size={18} /> Full Name
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Mail size={18} /> Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Lock size={18} /> Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Lock size={18} /> Confirm Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
            {isLogin ? 'Log In' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-cyan-600 hover:underline dark:text-cyan-400 font-medium"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
