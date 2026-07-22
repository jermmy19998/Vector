"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Language = "zh" | "en";
const I18nContext = createContext({ language:"zh" as Language, setLanguage:(_language:Language)=>{} });

export function I18nProvider({children}:{children:React.ReactNode}) {
  const [language,setLanguage]=useState<Language>("zh");
  useEffect(()=>{ document.documentElement.lang=language==="zh"?"zh-CN":"en"; },[language]);
  return <I18nContext.Provider value={{language,setLanguage}}>{children}</I18nContext.Provider>;
}
export function useI18n(){ return useContext(I18nContext); }
export function L({zh,en}:{zh:string;en:string}){const {language}=useI18n();return <>{language==="zh"?zh:en}</>}
