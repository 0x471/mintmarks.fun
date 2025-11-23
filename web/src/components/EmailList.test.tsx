import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { EmailList } from './EmailList'
import { useAuth } from '../contexts/AuthContext'
import { searchEmails } from '../services/gmail'

// Mock dependencies
vi.mock('../contexts/AuthContext')
vi.mock('../services/gmail')

const mockUseAuth = vi.mocked(useAuth)
const mockSearchEmails = vi.mocked(searchEmails)

describe('EmailList', () => {
  const mockOnEmailSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show login prompt when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      accessToken: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      handleTokenExpiration: vi.fn(),
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('Please sign in with Google to view your emails.')).toBeInTheDocument()
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('should load emails when authenticated', async () => {
    const mockEmails = [
      {
        id: 'msg1',
        subject: 'Test Subject 1',
        date: 'Mon, 01 Jan 2024 10:00:00 +0000',
        from: 'sender@example.com',
        snippet: 'Test snippet 1',
      },
      {
        id: 'msg2',
        subject: 'Test Subject 2',
        date: 'Tue, 02 Jan 2024 11:00:00 +0000',
        from: 'sender2@example.com',
        snippet: 'Test snippet 2',
      },
    ]

    mockUseAuth.mockReturnValue({
      accessToken: 'mock-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      handleTokenExpiration: vi.fn(),
    })

    mockSearchEmails.mockResolvedValue({
      emails: mockEmails,
      nextPageToken: undefined,
      hasMore: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('Loading emails...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Your Emails (2)')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Subject 1')).toBeInTheDocument()
    expect(screen.getByText('Test Subject 2')).toBeInTheDocument()
    expect(screen.getByText('From: sender@example.com | Date: Mon, 01 Jan 2024 10:00:00 +0000')).toBeInTheDocument()
  })

  it('should handle email selection', async () => {
    const mockEmails = [
      {
        id: 'msg1',
        subject: 'Test Subject 1',
        date: 'Mon, 01 Jan 2024 10:00:00 +0000',
        from: 'sender@example.com',
        snippet: 'Test snippet 1',
      },
    ]

    mockUseAuth.mockReturnValue({
      accessToken: 'mock-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      handleTokenExpiration: vi.fn(),
    })

    mockSearchEmails.mockResolvedValue({
      emails: mockEmails,
      nextPageToken: undefined,
      hasMore: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Test Subject 1')).toBeInTheDocument()
    })

    const emailElement = screen.getByText('Test Subject 1').closest('div')
    fireEvent.click(emailElement!)

    expect(mockOnEmailSelect).toHaveBeenCalledWith('msg1')
  })

  it('should handle pagination', async () => {
    const mockEmailsPage1 = [
      {
        id: 'msg1',
        subject: 'Test Subject 1',
        date: 'Mon, 01 Jan 2024 10:00:00 +0000',
        from: 'sender@example.com',
        snippet: 'Test snippet 1',
      },
    ]

    const mockEmailsPage2 = [
      {
        id: 'msg2',
        subject: 'Test Subject 2',
        date: 'Tue, 02 Jan 2024 11:00:00 +0000',
        from: 'sender2@example.com',
        snippet: 'Test snippet 2',
      },
    ]

    mockUseAuth.mockReturnValue({
      accessToken: 'mock-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      handleTokenExpiration: vi.fn(),
    })

    mockSearchEmails
      .mockResolvedValueOnce({
        emails: mockEmailsPage1,
        nextPageToken: 'next-token',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        emails: mockEmailsPage2,
        nextPageToken: undefined,
        hasMore: false,
      })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Test Subject 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Load More')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Load More'))

    await waitFor(() => {
      expect(screen.getByText('Test Subject 2')).toBeInTheDocument()
    })

    expect(screen.queryByText('Load More')).not.toBeInTheDocument()
  })

  it('should handle token expired error', async () => {
    const mockHandleTokenExpiration = vi.fn()

    mockUseAuth.mockReturnValue({
      accessToken: 'mock-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      handleTokenExpiration: mockHandleTokenExpiration,
    })

    mockSearchEmails.mockRejectedValue(new Error('Token expired'))

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Session expired. Please sign in again.')).toBeInTheDocument()
    })

    expect(mockHandleTokenExpiration).toHaveBeenCalled()
  })

  it('should handle general errors', async () => {
    mockUseAuth.mockReturnValue({
      accessToken: 'mock-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      handleTokenExpiration: vi.fn(),
    })

    mockSearchEmails.mockRejectedValue(new Error('Network error'))

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })
})
