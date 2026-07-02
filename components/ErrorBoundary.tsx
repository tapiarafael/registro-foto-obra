import React, { Component, PropsWithChildren } from "react";

import { ErrorFallback } from "@/components/ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren;

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    return this.state.error ? (
      <ErrorFallback error={this.state.error} resetError={this.resetError} />
    ) : (
      this.props.children
    );
  }
}
