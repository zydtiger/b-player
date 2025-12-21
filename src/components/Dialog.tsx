import React, { useState } from "react";

// --- Interfaces ---

/**
 * Props for the alert type dialog.
 */
interface AlertDialogProps {
  /** Title text to display at the top of the dialog */
  title: string;
  /** Main content text of the dialog */
  message: string;
  /** Callback fired when the user clicks the confirmation button */
  onConfirm?: () => void;
}

/**
 * Props for the input type dialog.
 */
interface InputDialogProps {
  /** Title text to display at the top of the dialog */
  title: string;
  /** Label or instruction text for the input */
  message: string;
  /** Initial value to populate the input field with */
  initialValue?: string;
  /** Callback fired when the user confirms the input */
  onConfirm?: (value: string) => void;
  /** Callback fired when the user cancels the input */
  onCancel?: () => void;
}

/**
 * Props for the main routing Dialog component.
 */
interface DialogProps {
  /** Determines which internal dialog component to render */
  type: "alert" | "input";
  /** Controls visibility of the modal overlay */
  isOpen: boolean;
  /** General handler to close the modal wrapper */
  onClose: () => void;
  /** Configuration for the alert dialog type */
  alert?: AlertDialogProps;
  /** Configuration for the input dialog type */
  input?: InputDialogProps;
}

// --- Internal Components ---

/**
 * Renders a simple alert dialog with a title, message, and confirmation button.
 *
 * @param props Component properties including title, message, and confirm handler
 * @returns React component for alert dialog
 */
const AlertDialog: React.FC<AlertDialogProps> = ({ title, message, onConfirm }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-200">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
      <div className="flex justify-end mt-4">
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 appearance-none bg-blue-800 hover:bg-blue-700 dark:bg-indigo-800 dark:hover:bg-indigo-700 text-white rounded-lg transition-colors duration-150 focus:outline-none active:outline-none active:border-transparent"
        >
          Ok
        </button>
      </div>
    </div>
  );
};

/**
 * Renders an input dialog with a text field, offering confirm and cancel actions.
 *
 * @param props Component properties including title, message, initial value, and handlers
 * @returns React component for input dialog
 */
const InputDialog: React.FC<InputDialogProps> = ({
  title,
  message,
  initialValue = "",
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState(initialValue);

  const handleConfirm = () => {
    onConfirm?.(inputValue);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md transition-all duration-200">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-700 dark:text-gray-300 mb-2">{message}</p>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-150"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleConfirm();
          }
        }}
      />
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors duration-150 focus:outline-none"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-3 py-1.5 appearance-none bg-blue-800 hover:bg-blue-700 dark:bg-indigo-800 dark:hover:bg-indigo-700 text-white rounded-lg transition-colors duration-150 focus:outline-none"
        >
          Ok
        </button>
      </div>
    </div>
  );
};

// --- Main Dialog Component ---

/**
 * Main dialog wrapper that handles routing to specific dialog types and overlay rendering.
 *
 * @param props Configuration props for routing and displaying the correct dialog
 * @returns The composed dialog component or null if not open
 */
const Dialog: React.FC<DialogProps> = ({ type, isOpen, onClose, alert, input }) => {
  if (!isOpen) {
    return null;
  }

  // Provide fallback logging to prevent unhandled actions if props are missing
  const defaultOnConfirm = () => {
    console.log("Dialog confirmed");
    onClose();
  };
  const defaultOnCancel = () => {
    console.log("Dialog cancelled");
    onClose();
  };

  const handleAlertConfirm = () => {
    if (alert?.onConfirm) alert.onConfirm();
    else defaultOnConfirm();
  };

  const handleInputConfirm = (value: string) => {
    if (input?.onConfirm) input.onConfirm(value);
    else defaultOnConfirm();
  };

  const handleInputCancel = () => {
    if (input?.onCancel) input.onCancel();
    else defaultOnCancel();
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black/50 dark:bg-black/60 flex justify-center items-center z-50 transition-opacity duration-200">
      {type === "alert" && alert && (
        <AlertDialog title={alert.title} message={alert.message} onConfirm={handleAlertConfirm} />
      )}
      {type === "input" && input && (
        <InputDialog
          title={input.title}
          message={input.message}
          initialValue={input.initialValue}
          onConfirm={handleInputConfirm}
          onCancel={handleInputCancel}
        />
      )}
    </div>
  );
};

export default Dialog;
