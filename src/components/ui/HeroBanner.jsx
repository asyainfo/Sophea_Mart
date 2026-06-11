export default function HeroBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 md:p-10 mb-8 text-white shadow-lg flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">
        Welcome to Sophea Mart!
      </h1>
      <p className="text-lg md:text-xl opacity-90 max-w-2xl">
        Your favorite snacks, toys, and everyday essentials—delivered fresh and
        fast.
      </p>
    </div>
  );
}
