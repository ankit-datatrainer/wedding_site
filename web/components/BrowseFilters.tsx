'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icon';
import { buildQuery } from '@/lib/api';

const MIN_AGES = [20, 25, 30, 35];
const MAX_AGES = [30, 35, 40, 45];
const MARITAL = ['Never Married', 'Divorced', 'Widowed'];
const RELIGIONS = ['Any', 'Hindu', 'Muslim', 'Christian', 'Sikh'];
const EDUCATION = ['Bachelors', 'Masters', 'Doctorate'];

/** The filter rail from the browse screen, kept in sync with the URL. */
export function BrowseFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const [minAge, setMinAge] = useState(params.get('minAge') ?? '25');
  const [maxAge, setMaxAge] = useState(params.get('maxAge') ?? '35');
  const [religion, setReligion] = useState(params.get('religion') ?? 'Any');
  const [marital, setMarital] = useState<string[]>(
    (params.get('maritalStatus') ?? 'Never Married').split(',').filter(Boolean)
  );
  const [education, setEducation] = useState<string[]>(
    (params.get('educationLevel') ?? '').split(',').filter(Boolean)
  );

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  function apply(event: React.FormEvent) {
    event.preventDefault();
    router.push(
      `/browse${buildQuery({
        gender: params.get('gender') ?? undefined,
        location: params.get('location') ?? undefined,
        community: params.get('community') ?? undefined,
        sort: params.get('sort') ?? undefined,
        minAge,
        maxAge,
        religion: religion === 'Any' ? undefined : religion,
        maritalStatus: marital,
        educationLevel: education,
      })}`
    );
  }

  function reset() {
    setMinAge('25');
    setMaxAge('35');
    setReligion('Any');
    setMarital(['Never Married']);
    setEducation([]);
    router.push('/browse');
  }

  const selectClass =
    'w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-body text-body-md text-on-surface focus:border-secondary focus:outline-none';

  return (
    <form
      onSubmit={apply}
      className="flex flex-col gap-8 rounded-xl bg-surface-container-lowest p-6 shadow-card"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-[22px] text-primary">Filters</h2>
        <button
          type="button"
          onClick={reset}
          className="font-body text-label-md uppercase text-secondary hover:underline"
        >
          Reset All
        </button>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-body text-label-lg uppercase text-primary">Age Range</legend>
        <div className="flex items-center gap-3">
          <select
            aria-label="Minimum age"
            className={selectClass}
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
          >
            {MIN_AGES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <span className="font-body text-label-md text-on-surface-variant">to</span>
          <select
            aria-label="Maximum age"
            className={selectClass}
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
          >
            {MAX_AGES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-body text-label-lg uppercase text-primary">
          Marital Status
        </legend>
        {MARITAL.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-3">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                marital.includes(option)
                  ? 'border-secondary bg-secondary text-on-secondary'
                  : 'border-outline-variant'
              }`}
            >
              {marital.includes(option) && <Icon name="check" className="text-[14px]" />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={marital.includes(option)}
              onChange={() => setMarital((v) => toggle(v, option))}
            />
            <span className="font-body text-body-md text-on-surface-variant">{option}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-body text-label-lg uppercase text-primary">Religion</legend>
        <select
          aria-label="Religion"
          className={selectClass}
          value={religion}
          onChange={(e) => setReligion(e.target.value)}
        >
          {RELIGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-body text-label-lg uppercase text-primary">
          Education Level
        </legend>
        {EDUCATION.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-3">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                education.includes(option)
                  ? 'border-secondary bg-secondary text-on-secondary'
                  : 'border-outline-variant'
              }`}
            >
              {education.includes(option) && <Icon name="check" className="text-[14px]" />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={education.includes(option)}
              onChange={() => setEducation((v) => toggle(v, option))}
            />
            <span className="font-body text-body-md text-on-surface-variant">{option}</span>
          </label>
        ))}
      </fieldset>

      <button
        type="submit"
        className="rounded-lg bg-secondary py-3 font-body text-label-lg uppercase text-on-secondary shadow-md transition-colors hover:bg-secondary-container"
      >
        Apply Filters
      </button>
    </form>
  );
}
