const Noise = () => {
  return (
    <svg
      className='pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.04]'
      xmlns='http://www.w3.org/2000/svg'
    >
      <filter id='noise'>
        <feTurbulence
          type='fractalNoise'
          baseFrequency='0.8'
          numOctaves='4'
          stitchTiles='stitch'
        />
      </filter>
      <rect width='100%' height='100%' filter='url(#noise)' />
    </svg>
  )
}

export { Noise }
