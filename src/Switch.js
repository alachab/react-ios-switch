import dynamics from 'dynamics.js';
import { interpolate } from 'd3-interpolate';
import classNames from 'classnames';
import invariant from 'invariant';
import React from 'react';
import styles from './Switch.scss';

class Switch extends React.Component {
  static defaultProps = {
    disabled: false,
    handleColor: 'white',
    maxOffset: 20,
    offColor: 'white',
    onColor: '#4cd964',
    pendingOffColor: '#e5e5e5',
  };

  constructor(props) {
    super(props);

    const offset = this.getCheckedStateOffset(props);

    // During a drag, we track the starting mouse position and the current mouse position.
    // This allows us to avoid accumulating deltas, and thus avoid accumulating errors.
    this.state = {
      currentClientX: 0,
      dragging: false,
      offset,
      startClientX: 0,
    };

    // At rest, the animated properties offset should equal the state offset.
    // During animation, they may be different.
    this.animatedProperties = {
      offset,
    };

    this.handleAnimationChange = this.handleAnimationChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleHandleClick = this.handleHandleClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    // Assume the props change occurred because the checked state changed. Animate back to the
    // rest state.
    this.startAnimation(nextProps);
  }

  componentWillUnmount() {
    const { dragging } = this.state;
    this.cancelAnimation();
    if (dragging) {
      this.removeListeners();
    }
  }

  // We should be able to compute the offset from the checked state.
  getCheckedStateOffset(props) {
    const { checked, maxOffset } = props;
    return checked ? maxOffset : 0;
  }

  addListeners() {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  cancelAnimation() {
    dynamics.stop(this.animatedProperties);
  }

  handleAnimationChange() {
    this.setState({
      offset: this.animatedProperties.offset,
    });
  }

  handleClick(e) {
    const { checked, onChange } = this.props;
    e.preventDefault();
    onChange(!checked);
  }

  handleHandleClick(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleInputChange() {
  }

  handleMouseDown(e) {
    const { dragging } = this.state;
    invariant(!dragging, 'Mouse down handler called inside of a drag');

    // Left click only
    if (e.button !== 0) {
      return;
    }

    this.cancelAnimation();
    this.setState({
      currentClientX: e.clientX,
      dragging: true,
      startClientX: e.clientX,
    });

    // While the drag is ongoing, we set document-level event handlers to capture mousemove and
    // mouseup. This way, the drag doesn't end if the user mouses off the handle. These event
    // handlers are expensive and global, so we need to make sure we remove them when the drag ends.
    this.addListeners();
  }

  handleMouseMove(e) {
    const { dragging } = this.state;
    invariant(dragging, 'Mouse move handler called outside of a drag');

    this.setState({
      currentClientX: e.clientX,
    });
  }

  handleMouseUp() {
    const { checked, maxOffset, onChange } = this.props;
    const { currentClientX, dragging, offset, startClientX } = this.state;

    invariant(dragging, 'Mouse up handler called outside of a drag');
    this.removeListeners();

    // If the mouse hasn't changed position by the end of a drag, treat it as a click on the handle.
    const deltaX = currentClientX - startClientX;
    if (!deltaX) {
      this.setState({
        dragging: false,
      });
      onChange(!checked);
      return;
    }

    // The checked state is a function of the mouse offset.
    const newOffset = offset + deltaX;
    const newChecked = newOffset > maxOffset / 2;

    this.setState({
      dragging: false,
      offset: newOffset,
    });
    onChange(newChecked);
  }

  removeListeners() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  startAnimation(props) {
    const { offset } = this.state;
    this.animatedProperties.offset = offset;

    // Note that spring animation always results in a bounce at the end. Choose parameters to
    // minimize this bounce.
    dynamics.animate(this.animatedProperties, {
      offset: this.getCheckedStateOffset(props),
    }, {
      change: this.handleAnimationChange,
      frequency: 200,
      friction: 400,
      type: dynamics.spring,
    });
  }

  render() {
    const {
      checked,
      disabled,
      handleColor,
      maxOffset,
      offColor,
      onColor,
      pendingOffColor,
    } = this.props;

    const { currentClientX, dragging, offset, startClientX } = this.state;

    // The handle position is a function of the mouse offset.
    const deltaX = dragging ? currentClientX - startClientX : 0;
    const clampedOffset = Math.min(maxOffset, Math.max(0, offset + deltaX));
    const handleTransform = `translateX(${clampedOffset}px)`;

    // The interpolation parameter is a function of the mouse offset.
    const t = clampedOffset / maxOffset;

    // The switch color is a function of the interpolation parameter.
    const color = interpolate(pendingOffColor, onColor)(t);

    // The off state size is a function of the interpolation parameter.
    const offStateTransform = `scale(${1 - t})`;

    return (
      <div
        className={classNames(
          styles.switch,
          disabled && styles['switch--disabled']
        )}
        onClick={this.handleClick}
        style={{
          backgroundColor: color,
        }}
      >
        <div
          className={styles.offState}
          style={{
            backgroundColor: offColor,
            msTransform: offStateTransform,
            transform: offStateTransform,
            WebkitTransform: offStateTransform,
          }}
        />
        <div
          className={styles.handle}
          onClick={this.handleHandleClick}
          onMouseDown={!disabled && this.handleMouseDown}
          style={{
            backgroundColor: handleColor,
            msTransform: handleTransform,
            transform: handleTransform,
            WebkitTransform: handleTransform,
          }}
        />
        <input
          className={styles.input}
          checked={checked}
          disabled={disabled}
          onChange={this.handleInputChange}
          type="checkbox"
        />
      </div>
    );
  }
}

export default Switch;
