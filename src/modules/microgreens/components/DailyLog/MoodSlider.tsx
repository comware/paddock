/**
 * MoodSlider - Visual mood/energy selector (1-10)
 *
 * Shows emoji feedback based on selected value.
 */

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

const moodEmojis: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😫', label: 'Exhausted' },
  2: { emoji: '😩', label: 'Very Low' },
  3: { emoji: '😔', label: 'Low' },
  4: { emoji: '😕', label: 'Below Average' },
  5: { emoji: '😐', label: 'Neutral' },
  6: { emoji: '🙂', label: 'Okay' },
  7: { emoji: '😊', label: 'Good' },
  8: { emoji: '😄', label: 'Great' },
  9: { emoji: '🤩', label: 'Excellent' },
  10: { emoji: '🔥', label: 'On Fire!' },
};

export function MoodSlider({ value, onChange, label = 'Mood & Energy' }: MoodSliderProps) {
  const currentMood = moodEmojis[value] || moodEmojis[5];

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>

      {/* Emoji Display */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-5xl transition-transform hover:scale-110">
          {currentMood.emoji}
        </span>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {currentMood.label}
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
          style={{
            background: `linear-gradient(to right,
              #f87171 0%,
              #facc15 50%,
              #4ade80 100%)`,
          }}
        />
        {/* Tick marks */}
        <div className="flex justify-between px-1 mt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-6 h-6 text-xs rounded-full transition-all ${
                value === n
                  ? 'bg-primary-500 text-white font-bold scale-110'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
