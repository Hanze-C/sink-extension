export const DotLoading = ({
  size = 25,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & { size?: number }) => {
  const dots = Array.from({ length: 3 }, (_, i) => (
    <div
      key={i}
      style={{
        display: 'inline-block',
        width: `${size / 3}px`,
        height: `${size / 3}px`,
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        margin: '0 2px',
        animation: `dot-animation ${1 + i * 0.2}s infinite linear`,
      }}
    />
  ));
  const style = `
    @keyframes dot-animation {
      0% {
        opacity: 0;
        transform: scale(0.5);
      }
      50% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.5);
      }
    }
  `;
  return (
    <div {...props}>
      <style>{style}</style>
      <div className='relative inline-flex items-center'>
        {dots}
      </div>
    </div>
  );
};
