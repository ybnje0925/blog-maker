import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section role="alert" className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft</p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">화면을 불러오는 중 문제가 발생했습니다</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            입력한 내용은 브라우저 저장 상태에 남아 있을 수 있습니다. 잠시 후 다시 시도하거나, 화면을 새로고침해 주세요.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={this.handleRetry} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
              다시 시도
            </button>
            <button type="button" onClick={this.handleReload} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
              새로고침
            </button>
            <a href="/" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
              홈으로 이동
            </a>
          </div>
        </section>
      </main>
    );
  }
}
