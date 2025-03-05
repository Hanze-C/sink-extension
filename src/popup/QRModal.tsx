import QrcodeSvg from '@src/assets/qrcode.svg?react';
import { forwardRef } from 'preact/compat';
import { useState } from 'preact/hooks';
import { QRImage } from './QRImage';

interface QRModalProps {
  text: string;
}

export interface QRModalRef {
  openModal: () => void;
  closeModal: () => void;
}

const QRModal = forwardRef<QRModalRef, QRModalProps>(({ text }, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  if (ref) {
    if (typeof ref === 'function') {
      ref({ openModal, closeModal });
    } else {
      ref.current = { openModal, closeModal };
    }
  }

  return (
    <div>
      <QrcodeSvg
        className='ml-1 cursor-pointer w-6 h-6'
        alt='Show QR Code'
        onClick={openModal}
      />

      {isOpen && (
        <div
          className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300'
          onClick={closeModal}
        >
          <div
            className='scale-100 transform rounded-lg bg-white p-4 shadow-lg transition-transform duration-300'
            onClick={e => e.stopPropagation()}
          >
            <button
              className='absolute right-2 top-2 text-gray-500 transition-all hover:text-gray-700'
              onClick={closeModal}
            >
              ✖
            </button>
            <QRImage text={text} />
          </div>
        </div>
      )}
    </div>
  );
});

export default QRModal;
