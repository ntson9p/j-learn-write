import type { Exercise } from '@j-learn-write/course';
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseRun } from '../src/components/run';

const exercises: Exercise[] = [
  { id: 'r-1', type: 'choice', promptVi: 'Một?', options: ['あ', 'い'], answer: 0 },
  { id: 'r-2', type: 'choice', promptVi: 'Hai?', options: ['う', 'え'], answer: 1 },
];

describe('ExerciseRun', () => {
  it('reports every answer and finishes once', () => {
    const onFinish = vi.fn();
    const onAnswer = vi.fn();
    render(<ExerciseRun exercises={exercises} onFinish={onFinish} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole('radio', { name: 'あ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    fireEvent.click(screen.getByRole('radio', { name: 'う' }));
    fireEvent.click(screen.getByRole('radio', { name: 'う' }));
    const next = screen.getByRole('button', { name: 'Tiếp tục' });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(onAnswer).toHaveBeenCalledTimes(2);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].map((a: { outcome: { correct: boolean } }) => a.outcome.correct)).toEqual([true, false]);
    expect(screen.queryByRole('button', { name: 'Tiếp tục' })).toBeNull();
  });
});
