import MainPage from "@/components/MainPage";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col flex-grow min-h-0"> 
      <MainPage />
      <Footer />
    </div>
  );
}
