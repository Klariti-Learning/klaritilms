
'use client';
import { Send } from 'lucide-react';

const messages = [
  {
    id: 1,
    name: 'Oliver James',
    message: 'Hey, did you see the new assignment that ma’am uploaded today?',
    time: '4:00 PM',
  },
  {
    id: 2,
    name: 'Devid Peter',
    message:
      'Yeah, I saw it. Looks a bit tricky. Planning to finish it by tonight. You?',
    time: '4:03 PM',
  },
  {
    id: 3,
    name: 'Lily Paul',
    message: 'Same! Let’s discuss if you get stuck.',
    time: '4:10 PM',
  },
  {
    id: 4,
    name: 'Akhil',
    message: 'Ok',
    time: '4:12 PM',
  },
];

export default function GroupChat() {
  return (
    <div className="max-w-full   p-6 rounded-xl shadow-md bg-white">
      {/* Header */}
      <div className="flex items-center justify-between  pb-3 mb-3">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="43" height="41" viewBox="0 0 43 41" fill="none">
            <rect x="0.5" y="0.256104" width="42" height="40.744" rx="5" fill="#004CCF"/>
            <ellipse cx="36" cy="6.56172" rx="6.5" ry="6.30561" fill="#D7E5FD" fillOpacity="0.24"/>
            <path d="M22.0003 20.6281C23.9514 20.6281 25.7191 21.2739 27.016 22.177C28.2482 23.0364 29.292 24.3135 29.292 25.6874C29.292 26.4416 28.9701 27.0666 28.4628 27.5312C27.9857 27.9697 27.3628 28.2541 26.7212 28.4478C25.4389 28.8364 23.7503 28.9614 22.0003 28.9614C20.2503 28.9614 18.5618 28.8364 17.2795 28.4478C16.6378 28.2541 16.0149 27.9697 15.5368 27.5312C15.0316 27.0676 14.7087 26.4426 14.7087 25.6885C14.7087 24.3145 15.7524 23.0374 16.9847 22.1781C18.2816 21.2739 20.0493 20.6281 22.0003 20.6281ZM29.292 21.6697C30.3795 21.6697 31.367 22.0291 32.0972 22.5374C32.7639 23.0031 33.4587 23.777 33.4587 24.7208C33.4587 25.2593 33.2243 25.7062 32.8753 26.026C32.5566 26.3187 32.1628 26.4906 31.8034 26.5989C31.3139 26.7468 30.7357 26.8228 30.1357 26.8562C30.2628 26.4968 30.3337 26.1062 30.3337 25.6874C30.3337 24.0885 29.3347 22.7301 28.217 21.7874C28.57 21.7094 28.9305 21.67 29.292 21.6697ZM14.7087 21.6697C15.0816 21.6711 15.4399 21.7103 15.7837 21.7874C14.667 22.7301 13.667 24.0885 13.667 25.6874C13.667 26.1062 13.7378 26.4968 13.8649 26.8562C13.2649 26.8228 12.6878 26.7468 12.1972 26.5989C11.8378 26.4906 11.4441 26.3187 11.1243 26.026C10.941 25.8617 10.7944 25.6607 10.694 25.436C10.5937 25.2113 10.5419 24.9679 10.542 24.7218C10.542 23.7791 11.2357 23.0041 11.9035 22.5385C12.7293 21.9723 13.7073 21.6694 14.7087 21.6697ZM28.7712 15.4197C29.4618 15.4197 30.1242 15.6941 30.6126 16.1825C31.101 16.6708 31.3753 17.3332 31.3753 18.0239C31.3753 18.7146 31.101 19.3769 30.6126 19.8653C30.1242 20.3537 29.4618 20.6281 28.7712 20.6281C28.0805 20.6281 27.4181 20.3537 26.9297 19.8653C26.4414 19.3769 26.167 18.7146 26.167 18.0239C26.167 17.3332 26.4414 16.6708 26.9297 16.1825C27.4181 15.6941 28.0805 15.4197 28.7712 15.4197ZM15.2295 15.4197C15.9202 15.4197 16.5825 15.6941 17.0709 16.1825C17.5593 16.6708 17.8337 17.3332 17.8337 18.0239C17.8337 18.7146 17.5593 19.3769 17.0709 19.8653C16.5825 20.3537 15.9202 20.6281 15.2295 20.6281C14.5388 20.6281 13.8764 20.3537 13.3881 19.8653C12.8997 19.3769 12.6253 18.7146 12.6253 18.0239C12.6253 17.3332 12.8997 16.6708 13.3881 16.1825C13.8764 15.6941 14.5388 15.4197 15.2295 15.4197ZM22.0003 11.2531C23.1054 11.2531 24.1652 11.692 24.9466 12.4734C25.728 13.2548 26.167 14.3146 26.167 15.4197C26.167 16.5248 25.728 17.5846 24.9466 18.366C24.1652 19.1474 23.1054 19.5864 22.0003 19.5864C20.8953 19.5864 19.8354 19.1474 19.054 18.366C18.2726 17.5846 17.8337 16.5248 17.8337 15.4197C17.8337 14.3146 18.2726 13.2548 19.054 12.4734C19.8354 11.692 20.8953 11.2531 22.0003 11.2531Z" fill="white"/>
         </svg>
        <h2 className="text-xl font-semibold text-[#1447E6]">Group Chat</h2>
                <div className="flex gap-1">
          {['🧒🏻', '🧒🏼', '🧒🏽', '🧒🏾', '🧒🏿'].map((emoji, i) => (
            <span key={i}>{emoji}</span>
          ))}
        </div>
        </div>

      </div>

      {/* Messages */}
      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex justify-between">
            <div className="flex gap-2">
              <div className="text-2xl">🧒</div>
              <div>
                <p className="font-semibold">{msg.name}</p>
                <p className="text-gray-600">{msg.message}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400 whitespace-nowrap">{msg.time}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="mt-4 flex items-center gap-2  pt-3">
        <div className="text-xl">🧒</div>
        <input
          type="text"
          placeholder="Amazing study chat group..."
          className="flex-1 px-4 py-2 rounded-full border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="p-2 bg-black rounded-full text-white hover:bg-gray-800">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
