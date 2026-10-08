import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Logo } from '#/components/ui/logo'

describe('Logo', () => {
  it('names the brand for screen readers', () => {
    render(<Logo />)

    expect(screen.getByRole('img', { name: 'Vrijedi.Ly' })).toBeInTheDocument()
  })
})
