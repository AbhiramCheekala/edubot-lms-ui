import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { CardDescription, CardTitle } from "../../components/ui/card"
import { useAuth } from "../../hooks/useAuth"
import { Eye, EyeOff,AlertCircle } from "lucide-react";
import { getCookie } from "../../lib/cookieUtils"

export const description =
  "A login page with two columns. The first column has the login form with email and password. There's a Forgot your passwork link and a link to sign up if you do not have an account. The second column has a cover image."

export function LoginPage() {
  const { login, isAuthenticated, account } = useAuth();
  const navigate = useNavigate();
  
  // disable typescript for this line
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const search = useSearch({from: '/login'}) as {redirectUrl?: string, shouldSendLoginInfo?: boolean};
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false); 

  useEffect(()=> {
    if(isAuthenticated){
      handleRedirect();
    }
  },[isAuthenticated]);

  const handleRedirect = () => {
    const redirectUrl = search.redirectUrl;
    const shouldSendLoginInfo = search.shouldSendLoginInfo;

    if (redirectUrl) {
      if (shouldSendLoginInfo) {
        const accessToken = getCookie("accessToken");
        const refreshToken = getCookie("refreshToken");
        const url = new URL(redirectUrl);
        url.searchParams.append("accessToken", accessToken);
        url.searchParams.append("refreshToken", refreshToken);
        url.searchParams.append("account", JSON.stringify(account));
        window.location.href = url.toString();
      } else {
        window.location.href = redirectUrl;
      }
    } else {
      navigate({ to: '/all' });
    }
  };

  const handleLogin =  () => {
    const email = emailRef.current.value;
    const password = passwordRef.current.value;
    setError("");
    setEmailError("");
    setPasswordError("");
    if (!email) {
      setEmailError("Email is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setPasswordError("Password is required.");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    login({ email, password }, 
      {
        onSuccess: () => {
          handleRedirect();
        },
        onError: () => {
          setError("Invalid credentials. Please try again.");
        },
      }
    );
  };

  // Helper function to get cookie value
  // function getCookie(name: string): string {
  //   const value = `; ${document.cookie}`;
  //   const parts = value.split(`; ${name}=`);
  //   if (parts.length === 2) return parts.pop().split(';').shift();
  //   return '';
  // }

  return (
    <div className="tw-w-full md:tw-grid md:tw-grid-cols-2 tw-h-full">
      <div className="tw-hidden tw-bg-muted md:tw-flex tw-flex-col tw-justify-end tw-items-center">
        <CardTitle className='tw-font-semibold tw-text-center tw-h-[40px]'>Welcome to Edubot</CardTitle>
        <CardDescription className='tw-text-[#666666] tw-text-center tw-h-[1px] tw-w-3/4'>Revolutionary learning empowers minds through innovative, personalized education.</CardDescription>
        <img src='/loginisslustraion.svg' alt='logo' className='tw-justify-center tw-h-[500px]' />
      </div>
      <div className="tw-flex tw-items-center tw-justify-center tw-py-12 tw-px-4 tw-h-full">
        <div className="tw-mx-auto tw-grid tw-w-[350px] tw-gap-6">
          <div className="tw-grid tw-gap-2 tw-text-center">
            <img src='/edubot_logo.svg' alt='logo' className='tw-block tw-mx-auto tw-w-1/2' />
          </div>
          <div className="tw-grid tw-gap-4">
            <div className="tw-grid tw-gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="tw-text-primary tw-font-bold"
                required
                ref={emailRef}
              />
               {emailError && (
                <span className="tw-text-red-500 tw-text-sm">
                  {emailError}
                </span>
              )}
            </div>
            <div className="tw-grid tw-gap-2">
              <div className="tw-flex tw-items-center  tw-justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="tw-relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"}
                required 
                className="tw-text-primary tw-font-bold tw-pr-10"
                ref={passwordRef}
              />
              <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="tw-absolute tw-right-2 tw-top-2 tw-text-gray-500" 
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {passwordError && (
                <span className="tw-text-red-500 tw-text-sm">
                  {passwordError}
                </span>
              )}
            </div>
            {error && (
            <div className="tw-text-red-600 tw-text-center tw-mb-4 tw-flex">
               <AlertCircle className="tw-w-5 tw-h-5 tw-mr-2 " />
              {error}
            </div>
          )}
            <Button type="submit" className="tw-w-full" onClick={handleLogin}>
              Login
            </Button>
            <Link
              to='/forgot-password'
              className="tw-m-auto tw-inline-block tw-underline tw-text-md"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
  </div>
  )
}