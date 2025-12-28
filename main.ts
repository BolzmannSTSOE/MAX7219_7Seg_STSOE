/**
* makecode Four Digit Display (MAX7219) Package.
* From microbit/micropython Chinese community.
* http://www.micropython.org.cn
* Forked and extended by Andy Bolzmann.
*/

/**
 * Four Digit Display
 */
//% weight=100 color=#006d19 icon="7"
namespace MAX7219_7Seg {
	
  //Registers (command) for MAX7219
  const _NOOP = 0 // no-op (do nothing, doesn't change current status)
  const _DIGIT = [1, 2, 3, 4, 5, 6, 7, 8] // digit (LED column)
  const _DECODEMODE = 9 // decode mode (1=on, 0-off; for 7-segment display on MAX7219, no usage here)
  const _INTENSITY = 10 // intensity-Register (LED brightness level, 0-15)
  const _SCANLIMIT = 11 // scan limit (number of scanned digits)
  const _SHUTDOWN = 12 // turn on (1) or off (0)
  const _DISPLAYTEST = 15 // force all LEDs light up, no usage here
  const MAX7219_PAUSE_TIME_US = 0
  // Segments of the 7-Seg: [0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F]
  //01111110 00110000 01101101 01111001 00110011 
  //01011011 01011111 01110000 01111111 01111011 
  //01110111 00011111 01001110 00111101 01001111 01000111
  let _SEGMENTS = [0x7E, 0x30, 0x6D, 0x79, 0x33, 0x5B, 0x5F, 0x70, 0x7F, 0x7B, 0x77, 0x1F, 0x8E, 0x3D, 0x4F, 0x47];

    /**
     * MAX7219 LED display
     */
    export class MAX7219_7Seg_obj {
        buf: Buffer;
        cs: DigitalPin;
        din: DigitalPin;
        miso: DigitalPin;
        clk: DigitalPin;
        brightness: number = 1;
		numberModules: number = 1; // number of MAX7219-Display-Modules in a chain
        count: number = 8;  // number of digits of a display module
		_reversed = false

        constructor(numberModules: number, cs: DigitalPin, din: DigitalPin, miso: DigitalPin, clk: DigitalPin) {
			this.numberModules = numberModules;
			this.cs = cs;
            this.din = din;
            this.miso = miso;
            this.clk = clk;
        }

        /**
         * initial MAX7219
         */
        init(): void {
            pins.digitalWritePin(this.cs, 1);
            control.waitMicros(MAX7219_PAUSE_TIME_US);
			
		    // initialize MAX7219s
		    this._registerAll(_SHUTDOWN, 0); // turn off
		    this._registerAll(_DISPLAYTEST, 0); // test mode off
		    this._registerAll(_DECODEMODE, 0); // decode mode off
		    this._registerAll(_SCANLIMIT, 7); // set scan limit to 7 (column 0-7)
		    this._registerAll(_INTENSITY, 1); // set brightness to 1
		    this._registerAll(_SHUTDOWN, 1); // turn on
		    this.clearAll() // clear screen on all MAX7219s
			
            //this.buf = pins.createBuffer(this.numberModules * 8);
            
        }

	  /**
	   * (internal function) write command and data to all MAX7219s
	   */
	  _registerAll(addressCode: number, data: number) {
		  
		// set micro:bit SPI
		pins.spiPins(this.din, this.miso, this.clk);
		pins.spiFormat(8, 0);
		pins.spiFrequency(1000000);
		  
		pins.digitalWritePin(this.cs, 0) // LOAD=LOW, start to receive commands
		//control.waitMicros(MAX7219_PAUSE_TIME_US);
		for (let i = 0; i < this.numberModules; i++) {
		  // when a MAX7219 received a new command/data set
		  // the previous one would be pushed to the next matrix along the chain via DOUT
		  pins.spiWrite(addressCode) // command (8 bits)
		  //control.waitMicros(MAX7219_PAUSE_TIME_US);
		  pins.spiWrite(data) //data (8 bits)
		  //control.waitMicros(MAX7219_PAUSE_TIME_US);
		}
		pins.digitalWritePin(this.cs, 1) // LOAD=HIGH, commands take effect
		//control.waitMicros(MAX7219_PAUSE_TIME_US);
	  }
	
	  /**
	   * (internal function) write command and data to a specific MAX7219 (index 0=farthest on the chain)
	   */
	  _registerForOne(addressCode: number, data: number, displayIndex: number) {
		if (this._reversed === true) displayIndex = this.numberModules-1 - displayIndex;
		  
		// set micro:bit SPI
		pins.spiPins(this.din, this.miso, this.clk);
		pins.spiFormat(8, 0);
		pins.spiFrequency(1000000);
		  
		if (displayIndex <= this.numberModules - 1) {
		  pins.digitalWritePin(this.cs, 0) // LOAD=LOW, start to receive commands
		  //control.waitMicros(MAX7219_PAUSE_TIME_US);
		  for (let i = 0; i < this.numberModules; i++) {
			// when a MAX7219 received a new command/data set
			// the previous one would be pushed to the next matrix along the chain via DOUT
			if (i == displayIndex) { // send change to target
			  pins.spiWrite(addressCode) // command (8 bits)
			  //control.waitMicros(MAX7219_PAUSE_TIME_US);
			  pins.spiWrite(data) //data (8 bits)
			  //control.waitMicros(MAX7219_PAUSE_TIME_US);
			} else { // do nothing to non-targets
			  pins.spiWrite(_NOOP)
			  //control.waitMicros(MAX7219_PAUSE_TIME_US);
			  pins.spiWrite(0)
			  //control.waitMicros(MAX7219_PAUSE_TIME_US);
			}
		  }
		  pins.digitalWritePin(this.cs, 1) // LOAD=HIGH, commands take effect
		  //control.waitMicros(MAX7219_PAUSE_TIME_US);
		}
	  }

		
	  /**
	   * Reverse order options for a MAX7219 modules chain
	   *
	   * @param reversed Defines the counting direction of the displays, eg: true
	   */
	  //% block="%display|Reverse printing order %reversed"
	  //% block.loc.de="%display|Reihenfolge der Displays umkehren %reversed"
	  //% jsdoc.loc.de="Konfiguriert die umgekehrte Reihenfolge, wenn mehrere Displays (MAX7219-Module) in einer Kette aneinandergehängt wurden."
	  //% group="1. Setup" blockExternalInputs=true advanced=true
	  reverseOrder(reversed: boolean) {	    
	    this._reversed = reversed
	  }
		

	  /**
	   * Set brightness level of LEDs on all MAX7219s
	   * WARNING: At an intensity level of 7 or higher, SPI data transfer may become corrupted, which can lead to incorrect patterns on the display.
	   */
	  //% block="%display|Set all brightness level %level"
	  //% block.loc.de="%display|Helligkeit aller Displays auf %level setzen"
      //% weight=70 blockGap=8
	  //% jsdoc.loc.de="Stellt die LED-Helligkeit aller Displays ein (0 = dunkel, 15 = sehr hell). ACHTUNG: Bei einem Helligkeitslevel von 7 oder höher kann es zu Übertragungsfehlern kommen, was zu fehlerhaften Anzeigen auf dem Display führen kann!"
	  //% level.min=0 level.max=15 level.defl=1 group="3. Basic light control"
	  brightnessAll(level: number) {
		this._registerAll(_INTENSITY, level)
	  }
	
	  /**
	   * Set brightness level of LEDs on a specific MAX7219s (index 0=farthest on the chain).
	   * WARNING: At an intensity level of 7 or higher, SPI data transfer may become corrupted, which can lead to incorrect patterns on the display.
	   */
	  //% block="%display|Set brightness level %level on matrix index %index"
	  //% block.loc.de="%display|Helligkeit %level auf dem Display mit Index %index setzen"
      //% weight=70 blockGap=8
	  //% jsdoc.loc.de="Stellt die LED-Helligkeit eines einzelnen Displays ein (0 = dunkel, 15 = sehr hell). Index 0 ist am weitesten in der Kette entfernt. ACHTUNG: Bei einem Helligkeitslevel von 7 oder höher kann es zu Übertragungsfehlern kommen, was zu fehlerhaften Anzeigen auf dem Display führen kann!"
	  //% level.min=0 level.max=15 level.defl=1 index.min=0 group="3. Basic light control" advanced=true
	  brightnessForOne(level: number, index: number) {
		this._registerForOne(_INTENSITY, level, index)
	  }


			
	  /**
	   * Turn on all LEDs on all MAX7219s
	   */
	  //% block="%display|Fill all LEDs"
	  //% block.loc.de="%display|Alle LEDs einschalten"
	  //% jsdoc.loc.de="Schaltet auf allen Displays alle LEDs ein."
	  //% group="3. Basic light control"
	  fillAll() {
	    for (let i = 0; i < this.count; i++) this._registerAll(i+1, 255)
	  }
	
	  /**
	   * Turn on LEDs on a specific MAX7219
	   */
	  //% block="%display|Fill LEDs on matrix index %index"
	  //% block.loc.de="%display|Alle LEDs auf dem Display mit Index %index einschalten"
	  //% jsdoc.loc.de="Schaltet auf einem einzelnen Display alle LEDs ein."
	  //% index.min=0 group="3. Basic light control" advanced=true
	  fillForOne(index: number) {
	    for (let i = 0; i < this.count; i++) this._registerForOne(i+1, 255, index)
	  }
	
	  /**
	   * Turn off LEDs on all MAX7219s
	   */
	  //% block="%display|Clear all LEDs"
	  //% block.loc.de="%display|Alle LEDs löschen"
	  //% jsdoc.loc.de="Schaltet auf allen Displays alle LEDs aus."
	  //% group="3. Basic light control"
	  clearAll() {
	    for (let i = 0; i < this.count; i++) this._registerAll(i+1, 0)
	  }
	
	  /**
	   * Turn off LEDs on a specific MAX7219 (index 0=farthest on the chain)
	   */
	  //% block="%display|Clear LEDs on matrix index %index"
	  //% block.loc.de="%display|LEDs auf dem Display mit Index %index löschen"
	  //% jsdoc.loc.de="Schaltet auf einem einzelnen Display alle LEDs aus."
	  //% index.min=0 group="3. Basic light control" advanced=true
	  clearForOne(index: number) {
	    for (let i = 0; i < this.count; i++) this._registerForOne(i+1, 0, index)
	  }
	
	  /**
	   * Turn on LEDs randomly on all MAX7219s
	   */
	  //% block="%display|Randomize all LEDs"
	  //% block.loc.de="%display|LEDs auf allen Displays zufällig einschalten"
	  //% jsdoc.loc.de="Schaltet auf allen Displays zufällig verteilte LEDs ein."
	  //% group="3. Basic light control"
	  randomizeAll() {
	    for (let i = 0; i < this.count; i++) this._registerAll(i+1, Math.randomRange(0, 255))
	  }
	
	  /**
	   * Turn on LEDs randomly on a specific MAX7219 (index 0=farthest on the chain)
	   */
	  //% block="%display|Randomize LEDs on matrix index %index"
	  //% block.loc.de="%display|LEDs zufällig auf dem Display mit Index %index einschalten"
	  //% jsdoc.loc.de="Schaltet auf einem einzelnen Display zufällig verteilte LEDs ein."
	  //% index.min=0 group="3. Basic light control" advanced=true
	  randomizeForOne(index: number) {
	    for (let i = 0; i < this.count; i++) this._registerForOne(i+1, Math.randomRange(0, 255), index)
	  }
	

		/**
		* Send 'Error' to the MAX7219, or at least as many digits as possible.
		*/
		_errorHandling() {			
			let ErrorMask = [0b1111001, 0b1010000, 0b1010000, 0b1011100, 0b1010000];
			let counttmp = 0
			for (let i = 0; i < Math.min(this.count,5); i++) {
				this._registerAll(i, ErrorMask[i])
				counttmp++
			}
			for (let i = counttmp; i < this.count; i++) {
				this._registerAll(i, 0)
			}
		}
        
        /**
         * Schaltet die Segmente a–g an einer Stelle des Displays ein oder aus.
		 *
		 * Bedeutung der Segmente:
		 * a = oben 
		 * b = rechts-oben 
		 * c = rechts-unten 
		 * d = unten 
		 * e = links-unten 
		 * f = links-oben     
		 * g = Mitte 
		 * 
		 * 
		 * 
		 * 
         * @param a Segment a (top)
         * @param b Segment b (right top)
         * @param c Segment c (right bottom)
         * @param d Segment d (bottom)
         * @param e Segment e (left bottom)
         * @param f Segment f (left top)
         * @param g Segment g (middle)
	 	 * @param pos Digit at display of MAX7219, eg: 0
	 	 * @param displayIndex Number of the display of MAX7219 chain, eg: 0
		*/
        //% blockId="MAX7219_7Seg_segmentsAt" block="%display|segments a %a b %b c %c d %d e %e f %f g %g|at %pos|of display %displayIndex"
        //% block.loc.de="%display|Einschalten der Segmente:| a %a b %b c %c d %d e %e f %f g %g|an der Stelle %pos|des Displays %displayIndex"
        //% block.loc.en="%display|segments:| a %a b %b c %c d %d e %e f %f g %g|at %pos|of display %displayIndex"
        //% a.loc.de="Segment a (oben)"
        //% a.loc.en="Segment a (top)"
        //% b.loc.de="Segment b (rechts oben)"
        //% b.loc.en="Segment b (right top)"
        //% c.loc.de="Segment c (rechts unten)"
        //% c.loc.en="Segment c (right bottom)"
        //% d.loc.de="Segment d (unten)"
        //% d.loc.en="Segment d (bottom)"
        //% e.loc.de="Segment e (links unten)"
        //% e.loc.en="Segment e (left bottom)"
        //% f.loc.de="Segment f (links oben)"
        //% f.loc.en="Segment f (left top)"
        //% g.loc.de="Segment g (Mitte)"
        //% g.loc.en="Segment g (middle)"
        //% pos.loc.de="Stelle im Display des MAX7219, z.B. 0 (ganz links)"
        //% pos.loc.en="Digit at display of MAX7219, e.g. 0 (most left)"
        //% displayIndex.loc.de="Display-Nummer innerhalb einer MAX7219-Kette, z.B. 0 = am weitesten entferntes Modul"
        //% displayIndex.loc.en="Display index of MAX7219, e.g. 0 = farthest module"
        //% inlineInputMode=external
        //% weight=90 blockGap=8 advanced=true
        //% parts="MAX7219_7Seg" pos.min=0 pos.max=3 pos.dflt=0 displayIndex.min=0 displayIndex.dflt=0
        segmentsAt(a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, g: boolean, pos: number = 0, displayIndex: number = 0) {
            let mask = 0
            if (a) mask |= 1 << 6
            if (b) mask |= 1 << 5
            if (c) mask |= 1 << 4
            if (d) mask |= 1 << 3
            if (e) mask |= 1 << 2
            if (f) mask |= 1 << 1
            if (g) mask |= 1 << 0
            //if (dp) mask |= 1 << 7			
            this.buf[pos % this.count] = mask & 0xFF
            this._registerForOne(pos+1, mask & 0xFF, displayIndex) //+1 because the register address for digit 0 is 1, for digit 7 is 8
        }
		

        /**
         * Light indicated segments (bitmask) at given position. 
		 * The Segments are defined using  a bitmask.
         *
		 * Bedeutung der Segmente:
		 * a = oben 
		 * b = rechts-oben 
		 * c = rechts-unten 
		 * d = unten 
		 * e = links-unten 
		 * f = links-oben     
		 * g = Mitte 
		 * 
         * | Segment bits (MSB -> LSB): 
         * bit6=a, bit5=b, bit4=c, bit3=d, bit2=e, bit1=f, bit0=g
         *
         * Example:
         * "8" (all segments a..g): 0b1111111
         * "4" (b,c,f,g):           0b0110011
         * @param segmentsText Segment-bitmask (binary recommended), eg: "0b0111011"
         * @param pos Digit position (0..count-1), eg: 0
	 	 * @param displayIndex Number of the display of MAX7219 chain, eg: 0
		*/
        //% blockId="MAX7219_7Seg_lightsegmentsat" block="%display|light segments (bits) %segmentsText|at %pos|of display %displayIndex"
        //% jsdoc.loc.de="Zeigt Segmente über eine Bitmaske an (für Fortgeschrittene), z.B. 0b00110111 für H oder 0b00110011 für 4."
        //% jsdoc.loc.en="Lights segments using a bitmask (advanced)."
        //% block.loc.de="%display|Einschalten der Segmente (binär) %segmentsText|der Stelle %pos|des Displays %displayIndex"
        //% block.loc.en="%display|light segments (bits) %segmentsText|at %pos|of display %displayIndex"
        //% segmentsText.loc.de="Segment-BitMaske (empfohlen binär), z.B. 0b1111111 für 8 oder 0b00110011 für 4"
        //% segmentsText.loc.en="Segment-bitmask (binary recommended), e.g. 0b1111111 for 8 or 0b00110011 for 4"
        //% pos.loc.de="Stelle im Display des MAX7219, z.B. 0 (ganz links)"
        //% pos.loc.en="Digit position (0..count-1)"
        //% displayIndex.loc.de="Display-Nummer innerhalb einer MAX7219-Kette, z.B. 0 = am weitesten entferntes Modul"
        //% displayIndex.loc.en="Display index of MAX7219, e.g. 0 = farthest module"
        //% weight=80 blockGap=8 advanced=true
		//% parts="MAX7219_7Seg" segmentsText.dflt="0b0110111" pos.min=0 pos.max=3 pos.dflt=0 displayIndex.min=0 displayIndex.dflt=0
        //% segmentsText.shadow="text"
        lightSegmentsAt(segmentsText: string = "0b0110111", pos: number = 0, displayIndex: number = 0) {
            let segments = parseBinText(segmentsText)
			if (segments == -1) {
				this._errorHandling()
				return;
			}
            this.buf[pos % this.count] = segments & 0x7F
            this._registerForOne(pos+1, segments & 0x7F, displayIndex) //+1 because the register address for digit 0 is 1, for digit 7 is 8
        }

		

        
        /**
         * show a number in given position.
         * @param num Number to be shown, eg: 5
         * @param bit Digit position, eg: 0
	 	 * @param displayIndex Number of the display of MAX7219 chain, eg: 0
		*/
        //% blockId="MAX7219_7Seg_showbit" block="%display|show number %num |at %bit|at display %displayIndex"
        //% jsdoc.loc.de="Zeigt eine einzelne Ziffer an einer bestimmten Stelle eines bestimmten Display-Moduls."
        //% jsdoc.loc.en="Shows a single digit at a given position of a given display."
        //% block.loc.de="%display|Setze die Ziffer %num |an die Stelle %bit|des Displays %displayIndex"
        //% block.loc.en="%display|show number %num |at %bit|at display %displayIndex"
        //% num.loc.de="Ziffer, die angezeigt werden soll, z.B. 5"
        //% num.loc.en="Number to be shown, e.g. 5"
        //% bit.loc.de="Stelle im Display des MAX7219, z.B. 0 (ganz links)"
        //% bit.loc.en="Digit position, e.g. 0 (most left)"
        //% displayIndex.loc.de="Display-Nummer innerhalb einer MAX7219-Kette, z.B. 0 = am weitesten entferntes Modul"
        //% displayIndex.loc.en="Display index of MAX7219, e.g. 0 = farthest module"
        //% weight=60 blockGap=8
        //% parts="MAX7219_7Seg" num.min=0 num.max=15 num.dflt=5 bit.min=0
        showbit(num: number = 5, bit: number = 0, displayIndex = 0) {
			// bei num=-1 wird das Digit ausgeschaltet
		    if (num < 0) {
		        this.buf[bit % this.count] = 0
		        this._registerForOne((bit % this.count)+1, 0, displayIndex)
		        return
		    }
            this.buf[bit % this.count] = _SEGMENTS[num % 16]
            this._registerForOne((bit % this.count)+1, _SEGMENTS[num % 16], displayIndex) //+1 because the register address for digit 0 is 1, for digit 7 is 8
        }

        /**
          * show a number. 
          * @param num Number to be shown, eg: 281
		*/
        //% blockId="MAX7219_7Seg_shownumwithleadingzeros" block="%display|show number %num with leading zeros"
        //% jsdoc.loc.de="Zeigt eine Zahl auf dem Display an, z.B. 28 als 0028."
        //% jsdoc.loc.en="Shows a number on the display."
        //% block.loc.de="%display|Zeige die Zahl %num und fülle vorne mit Nullen auf."
        //% block.loc.en="%display|show number %num with leading zeros"
        //% num.loc.de="Zahl, die angezeigt werden soll, z.B. 281"
        //% num.loc.en="Number to be shown, e.g. 281"
        //% weight=40 blockGap=8
        //% parts="MAX7219_7Seg" num.dflt=281
        showNumberWithLeadingZeros(num: number) {
            if (num < 0) {
                this._registerForOne(0+1, 0x01,0) // '-' //+1 because the register address for digit 0 is 1, for digit 7 is 8
                num = -num
            }
            else {
                this.showbit(Math.idiv(num, 10**((this.numberModules * this.count) -1)) % 10, 0, 0)
			}
			
			for (let i = ((this.numberModules * this.count)-1)-1; i >= 0; i--) {
				this.showbit(Math.idiv(num, 10**i) % 10, this._getDigitIndex(i), this._getDisplayIndex(i) ) 
			}							 
        }

		/* 
		* (internal) Helps to find the digit of a display by given digit of the decimal number.
		* num is the digit position in the decimal number, counted from the right, starting at 0.
		* Example: In the number 34567, the digit 7 has num = 0, and the digit 3 has num = 4.
		* 
		* num ist die Stelle der Dezimalzahl, von rechts an gezählt, mit 0 beginnend. 
		* Beispiel: In der Zahl 34567 ist für die 7 num=0, für die 3 ist num=4.
		*/
		_getDigitIndex(num: number) {
			return (this.count-1 - (num % this.count))
		}
		/* 
		* (internal) Helps to find the display index by given digit of the decimal number.
		* num is the digit position in the decimal number, counted from the right, starting at 0.
		* Example: In the number 34567, the digit 7 has num = 0, and the digit 3 has num = 4.
		* 
		* num ist die Stelle der Dezimalzahl, von rechts an gezählt, mit 0 beginnend. 
		* Beispiel: In der Zahl 34567 ist für die 7 num=0, für die 3 ist num=4.
		*/
		_getDisplayIndex(num: number) {
			return this.numberModules-1 - Math.idiv(num,this.count)
		}

        /**
          * show a number with max 4 digits. 
          * @param num is a number with max 4 digits, eg: 1284
	*/
        //% blockId="MAX7219_7Seg_shownum" block="%display|show number %num"
        //% jsdoc.loc.de="Zeigt eine Zahl auf dem Display an."
        //% jsdoc.loc.en="Shows a number on the display."
        //% block.loc.de="%display|Zeige die Zahl %num"
        //% block.loc.en="%display|show number %num"
        //% num.loc.de="Eine Zahl mit max. 4 Stellen, z.B. 1284"
        //% num.loc.en="is a number with max 4 digits, eg: 1284"
        //% weight=50 blockGap=8
        //% parts="MAX7219_7Seg" num.dflt=1273
        showNumber(num: number) {
			//this.clear()			
			let sign = 0
            if (num < 0) {
				sign = -1
                num = -num
            }
			for (let i = 0; i < this.numberModules * this.count; i++) {
				if (num >= 10**i) this.showbit(Math.idiv(num, 10**i) % 10, this._getDigitIndex(i), this._getDisplayIndex(i)); 
				else this.showbit(-1, this._getDigitIndex(i), this._getDisplayIndex(i));
			}
			if (num == 0) this.showbit(0, this.count-1, this.numberModules-1)
            if (sign < 0) {
                this._registerForOne(this._getDigitIndex(Math.min((this.numberModules*this.count)-1, Math.abs(num).toString().length))+1, 0x01, this._getDisplayIndex(Math.min((this.numberModules*this.count)-1, Math.abs(num).toString().length))) // 0x01 = '-'   //+1 because the register address for digit 0 is 1, for digit 7 is 8
            }
			/*
			for (let i = 0; i < this.count; i++) {
				if (num >= 10**i) this.showbit(Math.idiv(num, 10**i) % 10, this.count-1-i); 
				else this.showbit(-1, this.count-1-i);
			}
			if (num == 0) this.showbit(0, this.count-1)
            if (sign < 0) {
                this._dat(3 - Math.min(3, Math.abs(num).toString().length), 0x40) // '-'
            }
			*/
        }

        /**
          * show a hex number. 
          * @param numText a hex number, eg: 0xA7F
	*/
        //% blockId="MAX7219_7Seg_showhex" block="%display|show hex number %numText"
        //% jsdoc.loc.de="Zeigt eine Zahl im Hex-Format (0–F) an."
        //% jsdoc.loc.en="Shows a number in hex (0–F)."
        //% block.loc.de="%display|Zeige die Hexadezimalzahl %numText"
        //% block.loc.en="%display|show hex number %numText"
        //% numText.loc.de="Eine Hexadezimalzahl, z.B. 0xA7F"
        //% numText.loc.en="a hex number, eg: 0xA7F"
        //% weight=30 blockGap=8
        //% parts="MAX7219_7Seg"
		//% numText.shadow="text"
        showHex(numText: string) {
            let num = parseHexText(numText, this.numberModules * this.count)
			if (num == -1) {
				this._errorHandling()
				return;
			}
			for (let i = this.numberModules * this.count -1; i >= 0; i--) {
				if (num > 16**i) this.showbit(Math.idiv(num, 0x1000) % 16, this._getDigitIndex(i), this._getDisplayIndex(i));
				else this.showbit(-1, this._getDigitIndex(i), this._getDisplayIndex(i));
			}
			/*
			if (num > 0xFFF) this.showbit(Math.idiv(num, 0x1000) % 16, 0); 
			else this.showbit(-1,0);
			if (num >  0xFF) this.showbit(Math.idiv(num, 0x100) % 16, 1); 
			else this.showbit(-1,1);
			if (num >   0xF) this.showbit(Math.idiv(num, 0x10) % 16, 2); 
			else this.showbit(-1,2);
			if (num >=  0x0) this.showbit(num % 16, 3); 
			else this.showbit(-1,3);
			*/
        }

	  /**
	   * Show a random number defined by minimum and maximum.
	   */
	  //% block="%display|Show random number Min = %numMin Max = %numMax"
	  //% block.loc.de="%display|Zeige Zufallszahl Min = %numMin Max = %numMax"
	  //% jsdoc.loc.de="Zeigt eine Zufallszahl von Minimum bis Maximum."
	  //% index.min=0 group="3. Basic light control" advanced=true
	  showRandomNumber(numMin: number, numMax: number) {
		  this.showNumber(Math.randomRange(numMin, numMax));
	  }

		
        /**
         * show or hide dot point. 
         * @param bit is the position on a display, eg: 1
         * @param displayIndex is the display index, eg: 0
         * @param show is show/hide dp, eg: true
	*/
        //% blockId="MAX7219_7Seg_showDP" block="%display|DotPoint at digit %bit|of Display %displayIndex|show %show"
        //% jsdoc.loc.de="Schaltet den Dezimalpunkt (oder Doppelpunkt) ein oder aus."
        //% jsdoc.loc.en="Shows or hides the dot point."
        //% block.loc.de="%display|Dezimalpunkt rechts der Stelle %bit|des Displays %displayIndex| setzen %show"
        //% block.loc.en="%display|DotPoint at %bit|of Display %displayIndex|show %show"
        //% bit.loc.de="Stelle im Display, von der rechts der Punkt angezeigt werden soll, z.B. 1"
        //% bit.loc.en="is the position, eg: 1"
        //% displayIndex.loc.de="Das Display, auf dem der Punkt angezeigt werden soll, z.B. 0"
        //% displayIndex.loc.en="The Display the point has to be shown on, eg: 0"
        //% show.loc.de="EIN = Wahr, AUS = Falsch"
        //% show.loc.en="is show/hide dp, eg: true"
        //% weight=20 blockGap=8
        //% parts="MAX7219_7Seg"
        showDP(bit: number = 1, displayIndex: number = 0, show: boolean = true) {
            bit = bit % this.count
            if (show) this._registerForOne(bit+1, this.buf[bit] | 0x80, displayIndex)
            else this._registerForOne(bit+1, this.buf[bit] & 0x7F, displayIndex)
        }

        /**
         * clear LED. 
         */
        //% blockId="MAX7219_7Seg_clear" block="clear all digits of %display"
        //% jsdoc.loc.de="Löscht die Anzeige (alle Segmente aus)."
        //% jsdoc.loc.en="Clears the display (all segments off)."
        //% block.loc.de="Lösche alle Stellen des Displays %display"
        //% block.loc.en="clear all digits of %display"
        //% weight=10 blockGap=8
        //% parts="MAX7219_7Seg"
        clear() {
			for (let m = 0; m < this.numberModules; m++) {
	            for (let i = 0; i < this.count; i++) {
	                this._registerForOne(i+1, 0, m)
	                this.buf[m * this.count + i] = 0
	            }
			}
        }

        /**
         * Turn on all display modules. 
         */
        //% blockId="MAX7219_7Seg_on" block="turn on %display"
        //% jsdoc.loc.de="Schaltet das Display ein."
        //% jsdoc.loc.en="Turns the display on."
        //% block.loc.de="Schalte das Display %display ein."
        //% block.loc.en="turn on %display"
        //% weight=90 blockGap=8
        //% parts="MAX7219_7Seg"
        on() {
            this._registerAll(_SHUTDOWN,1);
        }

        /**
         * turn off LED. 
         */
        //% blockId="MAX7219_7Seg_off" block="turn off %display"
        //% jsdoc.loc.de="Schaltet das Display aus."
        //% jsdoc.loc.en="Turns the display off."
        //% block.loc.de="Schalte das Display %display aus."
        //% block.loc.en="turn off %display"
        //% weight=80 blockGap=8
        //% parts="MAX7219_7Seg"
        off() {
            this._registerAll(_SHUTDOWN,0);			
        }      
		
    }
	

	/**
	* Helper function to strip whitespaces and underscores
	*/
	function _stripSeparators(text: string): string {
	    let out = ""
	    for (let i = 0; i < text.length; i++) {
	        const c = text.charAt(i)
	        // entfernt Leerzeichen, Tabs, CR/LF und _
	        if (c == " " || c == "\t" || c == "\r" || c == "\n" || c == "_") continue
	        out += c
	    }
	    return out
	}
	/**
	* Helper function to check, if binary string contains only 0 and 1
	*/
	function _isBinDigits(s: string): boolean {
	    if (s.length == 0) return false
	    for (let i = 0; i < s.length; i++) {
	        const c = s.charAt(i)
	        if (c != "0" && c != "1") return false
	    }
	    return true
	}
	/**
	* Helper function to check, if hex string contains only hex letters
	*/
	function _isHexDigits(s: string): boolean {
	    if (s.length == 0) return false
	    for (let i = 0; i < s.length; i++) {
	        const code = s.charCodeAt(i)
	        const is09 = (code >= 48 && code <= 57)
	        const isAF = (code >= 65 && code <= 70)
	        const isaf = (code >= 97 && code <= 102)
	        if (!(is09 || isAF || isaf)) return false
	    }
	    return true
	}


	
    /**
     * Parse text in formats and convert to numbers:
     * - 0b1010... (binary, only 0/1, NO negative allowed)
     * - 0xA7F...  (hex, only 0-9/A-F/a-f, NO negative allowed, if >2 hex digits -> last 2 digits used)
     * Returns -1 on invalid input.
     */
    function parseBinText(text: string): number {
        if (!text) return -1;

        // remove spaces and underscores
        let s = _stripSeparators(text);
        if (s.length == 0) return -1;

        // sign negative is invalid
        let sign = 1;
        if (s.charAt(0) == "-") { sign = -1; s = s.substr(1); }
        else if (s.charAt(0) == "+") { s = s.substr(1); }

        if (s.length == 0) return -1;
		if (sign < 0) return -1; // no negative numbers allowed.

        // binary
        if (s.length >= 2 && (s.substr(0, 2) == "0b" || s.substr(0, 2) == "0B")) {
            let bits = s.substr(2);
            if (bits.length == 0) return -1;
            if (!_isBinDigits(bits)) return -1; // if bits contains any other than 0 or 1
			
            // keep last 7 bin digits if longer
            if (bits.length > 7) bits = bits.substr(bits.length - 7);
			
            let bitsnum =  parseInt(bits, 2);
			if (isNaN(bitsnum)) return -1;
			return bitsnum;
        }

        // hex
        if (s.length >= 2 && (s.substr(0, 2) == "0x" || s.substr(0, 2) == "0X")) {
            let hex = s.substr(2);
            if (hex.length == 0) return -1;
            if (!_isHexDigits(hex)) return -1; // if hex contains any other than allowed hex letters

            // keep last 2 hex digits if longer
            if (hex.length > 2) hex = hex.substr(hex.length - 2);
			if (hex.length == 0) return -1;

			let hexNum = parseInt(hex, 16);
			if (isNaN(hexNum)) return -1;
			hexNum &= 0x7F
			return hexNum;
        }
		return -1;
    }

    /**
     * Parse text in formats and convert to numbers:
     * - 0xA7F...  (hex, only 0-9/A-F/a-f, NO negative allowed, if >4 hex digits -> last 4 digits used)
     * Returns -1 on invalid input.
     */
    function parseHexText(text: string, digitCount: number): number {
        if (!text) return -1;

        // remove spaces and underscores
        let s = _stripSeparators(text);
        if (s.length == 0) return -1;

        // sign negative is invalid
        let sign = 1;
        if (s.charAt(0) == "-") { sign = -1; s = s.substr(1); }
        else if (s.charAt(0) == "+") { s = s.substr(1); }

        if (s.length == 0) return -1;
		if (sign < 0) return -1; // no negative numbers allowed.

        // hex
        if (s.length >= 2 && (s.substr(0, 2) == "0x" || s.substr(0, 2) == "0X")) {
            let hex = s.substr(2);
            if (hex.length == 0) return -1;
            if (!_isHexDigits(hex)) return -1; // if hex contains any other than allowed hex letters

            // keep last 'digitCount' hex digits if longer
            if (hex.length > digitCount) hex = hex.substr(hex.length - digitCount);
			if (hex.length == 0) return -1;

			let hexNum = parseInt(hex, 16);
			if (isNaN(hexNum)) return -1;
			return hexNum;
        }
		return -1;		
    }




	
    /**
     * Create a Digit Display (MAX7219) object.
	 * Enter the number of display-modules at a chain and the Digital Pins you use for communication.
	 * The MISO Pin is not used for this purpose.
     * @param numberModules the count of modules at a chain, eg: 1
     * @param cs the CS pin for MAX7219, eg: DigitalPin.C16
     * @param din the DIN pin for MAX7219, eg: DigitalPin.C17
     * @param miso the MISO pin for MAX7219, eg: DigitalPin.C14
     * @param clk the CLK pin for MAX7219, eg: DigitalPin.C15
     */
    //% weight=200 blockGap=8
    //% blockId="MAX7219_7Seg_create" block="Number of modules %numberModules|CS %cs|DIN %din|MISO (not used) %miso|CLK %clk"
    //% block.loc.de="Anzahl der Displays %numberModules|CS %cs|DIN %din|MISO (not used) %miso|CLK %clk"
    //% block.loc.en="Number of modules %numberModules|CS %cs|DIN %din|MISO (not used) %miso|CLK %clk"
	//% jsdoc.loc.de="Richtet die MAX7219-Module ein, setzt sie zurück und initialisiert sie neu. Gib die Anzahl der Module an, die in deiner Kette aneinandergehängt wurden. Der MISO-Pin wird nicht benutzt - er sollte am Calliope frei bleiben."
    //% clk.loc.de="Pin für das Clock Signal (CLK)"
    //% clk.loc.en="Pin used for Clock Signal (CLK)"
    //% din.loc.de="Pin für das Daten Signal (DIN)"
    //% din.loc.en="Pin used for Data Signal (DIN)"
    //% cs.loc.de="Pin für das Steuerungssignal (CS)"
    //% cs.loc.en="Pin used for Control Signal (CS)"
    //% miso.loc.de="Pin ungenutzt (MISO)"
    //% miso.loc.en="Pin not used (MISO)"
    //% numberModules.loc.de="Anzahl der Displays, z.B. 1"
    //% numberModules.loc.en="Count of display, eg: 1"
    //% inlineInputMode=inline count.min=1 count.dflt=1
    //% blockSetVariable=display
    export function create(numberModules: number = 1, cs: DigitalPin, din: DigitalPin, miso: DigitalPin, clk: DigitalPin): MAX7219_7Seg_obj {
        let display = new MAX7219_7Seg_obj(numberModules, cs, din, miso, clk);
        display.init();
        return display;
	}

    
}
