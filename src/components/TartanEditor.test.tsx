// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import TartanEditor from './TartanEditor'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaultProps = {
  name: 'Gordon',
  palette: 'G#005020 K#101010',
  threadcount: 'G/36 K2 G/36',
  parentSlug: 'gordon',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchSuccess(slug = 'my-tartan') {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ slug }),
  } as Response)
}

function mockFetchError(errorMessage = 'Something went wrong') {
  vi.mocked(fetch).mockResolvedValue({
    ok: false,
    json: async () => ({ error: errorMessage }),
  } as Response)
}

function typeName(value: string) {
  fireEvent.change(screen.getByLabelText('New Tartan Name'), { target: { value } })
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /Save New Tartan/i }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TartanEditor — handleSave', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('location', { href: '' })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  // -------------------------------------------------------------------------
  // Name validation
  // -------------------------------------------------------------------------

  it('shows a validation error and does not call fetch when name is empty', () => {
    render(<TartanEditor {...defaultProps} />)

    clickSave()

    expect(screen.getByText('Please enter a name for your tartan.')).toBeTruthy()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('shows a validation error and does not call fetch when name is only whitespace', () => {
    render(<TartanEditor {...defaultProps} />)

    typeName('   ')
    clickSave()

    expect(screen.getByText('Please enter a name for your tartan.')).toBeTruthy()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Fetch payload
  // -------------------------------------------------------------------------

  it('calls fetch with the correct method, headers, and name', async () => {
    mockFetchSuccess()
    render(<TartanEditor {...defaultProps} />)

    typeName('My Tartan')
    clickSave()

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/tartans')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')

    const body = JSON.parse(init?.body as string)
    expect(body.name).toBe('My Tartan')
  })

  it('sends the current palette, threadcount, and parentSlug in the payload', async () => {
    mockFetchSuccess()
    render(<TartanEditor {...defaultProps} />)

    typeName('My Tartan')
    clickSave()

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(body.palette).toBe(defaultProps.palette)
    expect(body.threadcount).toBe(defaultProps.threadcount)
    expect(body.parent_slug).toBe(defaultProps.parentSlug)
  })

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  it('redirects to the new tartan page on a successful response', async () => {
    mockFetchSuccess('my-tartan')
    render(<TartanEditor {...defaultProps} />)

    typeName('My Tartan')
    clickSave()

    await waitFor(() => {
      expect(window.location.href).toBe('/tartan/my-tartan')
    })
  })

  // -------------------------------------------------------------------------
  // Error paths
  // -------------------------------------------------------------------------

  it('shows the error from the API response on a non-OK response', async () => {
    mockFetchError('Name already taken')
    render(<TartanEditor {...defaultProps} />)

    typeName('My Tartan')
    clickSave()

    await waitFor(() => {
      expect(screen.getByText('Name already taken')).toBeTruthy()
    })
  })

  it('shows a generic error when the API returns non-OK without an error field', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response)

    render(<TartanEditor {...defaultProps} />)

    typeName('My Tartan')
    clickSave()

    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeTruthy()
    })
  })

  it('shows a network error message when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'))
    render(<TartanEditor {...defaultProps} />)

    typeName('My Tartan')
    clickSave()

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // Saving state
  // -------------------------------------------------------------------------

  it('disables the button and shows "Saving…" while the request is in flight', async () => {
    // A promise that never resolves keeps the component in saving state
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))

    render(<TartanEditor {...defaultProps} />)
    typeName('My Tartan')
    clickSave()

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).toBeTruthy()
    })

    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('re-enables the button after a failed request', async () => {
    mockFetchError('Bad request')
    render(<TartanEditor {...defaultProps} />)

    typeName('My Tartan')
    clickSave()

    await waitFor(() => {
      expect(screen.queryByText('Save New Tartan')).toBeTruthy()
    })

    const btn = screen.getByRole('button', { name: /Save New Tartan/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })
})
