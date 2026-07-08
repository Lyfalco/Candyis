import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PALETTE } from '../theme/colors';

interface Props {
  children: React.ReactNode;
  /** Called (in addition to clearing the caught error) when the user taps "Try Again" — e.g. navigate back to a known-good screen instead of re-rendering the same tree that just crashed. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions (e.g. a stray "two children with the same
 * key" from a rare data collision) so one bad frame shows a recoverable
 * screen instead of taking the whole app down. Also logs the full component
 * stack — if a rare crash like that recurs, that log is what pinpoints
 * exactly which list produced it, instead of guessing.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught a render error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops, something glitched</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: PALETTE.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: PALETTE.textMuted,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: PALETTE.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
