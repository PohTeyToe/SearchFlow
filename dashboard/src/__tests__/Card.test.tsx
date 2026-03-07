import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader, CardFooter } from '../components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello World</Card>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders as a div by default', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.querySelector('div')).toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders as a button when onClick is provided', () => {
    const handleClick = vi.fn();
    const { container } = render(<Card onClick={handleClick}>Clickable</Card>);
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    fireEvent.click(button!);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="my-class">Content</Card>);
    expect(container.firstChild).toHaveClass('my-class');
  });
});

describe('CardHeader', () => {
  it('renders title text', () => {
    render(<CardHeader>Dashboard</CardHeader>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(
      <CardHeader action={<button>Action</button>}>Title</CardHeader>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });
});
